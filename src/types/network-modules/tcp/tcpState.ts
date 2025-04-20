import { Flags, TcpSegment } from "../../../packets/tcp";

// TODO: import
type Port = number;

const MAX_BUFFER_SIZE = 0xffff;

function getInitialSeqNumber() {
  return Math.floor(Math.random() * 0xffffffff);
}

// TODO: add overflow checks
class TcpState {
  private srcPort: Port;
  private dstPort: Port;

  // Buffer of data received
  private readBuffer = new BytesBuffer(MAX_BUFFER_SIZE);
  private readClosed = false;

  // Buffer of data to be sent
  private writeBuffer = new BytesBuffer(MAX_BUFFER_SIZE);
  private writeClosed = false;

  // See https://datatracker.ietf.org/doc/html/rfc9293#section-3.3.1
  // SND.UNA
  private sendUnacknowledged: number;
  // SND.NXT
  private sendNext: number;
  // SND.WND
  private sendWindow: number;
  // SND.UP
  // private sendUrgentPointer: number;
  // SND.WL1
  private seqNumForLastWindowUpdate: number;
  // SND.WL2
  private ackNumForLastWindowUpdate: number;
  // ISS
  private initialSendSeqNum;

  // RCV.NXT
  private recvNext: number;
  // RCV.WND
  private recvWindow = MAX_BUFFER_SIZE;

  // IRS
  // private initialRecvSeqNum: number;

  private sendSegment: (tcpSegment: TcpSegment) => void;

  constructor(
    srcPort: Port,
    dstPort: Port,
    sendSegment: (tcpSegment: TcpSegment) => void,
  ) {
    this.srcPort = srcPort;
    this.dstPort = dstPort;
    this.initialSendSeqNum = getInitialSeqNumber();
    this.sendSegment = sendSegment;
  }

  startConnection() {
    const flags = new Flags().withSyn();
    const segment = this.newSegment(this.initialSendSeqNum, 0).withFlags(flags);
    this.sendSegment(segment);
  }

  recvSynAck(segment: TcpSegment) {
    if (!segment.flags.syn || !segment.flags.ack) {
      return false;
    }
    if (segment.acknowledgementNumber !== this.initialSendSeqNum + 1) {
      return false;
    }
    this.recvNext = segment.sequenceNumber + 1;
    // this.initialRecvSeqNum = segment.sequenceNumber;
    this.sendNext = segment.acknowledgementNumber;
    this.sendWindow = segment.window;

    const ackSegment = this.newSegment(this.sendNext, this.recvNext);
    ackSegment.withFlags(new Flags().withAck());
    this.sendSegment(ackSegment);
  }

  recvSegment(receivedSegment: TcpSegment) {
    // Sanity check: ports match with expected
    if (
      receivedSegment.destinationPort !== this.dstPort ||
      receivedSegment.sourcePort !== this.srcPort
    ) {
      throw new Error("segment not for this socket");
    }
    // Check the sequence number is valid
    const segSeq = receivedSegment.sequenceNumber;
    const segLen = receivedSegment.data.length;
    if (!this.isSeqNumValid(segSeq, segLen)) {
      return false;
    }

    // TODO: check RST flag

    // For now this only accepts ACK segments.
    // 3WHS are handled outside of this function
    if (!receivedSegment.flags.ack) {
      return false;
    }
    if (!this.recvAck(receivedSegment)) {
      return false;
    }

    // Process the segment data
    // NOTE: for simplicity, we ignore cases where RCV.NXT != SEG.SEQ
    if (receivedSegment.sequenceNumber === this.recvNext) {
      let receivedData = receivedSegment.data;
      // NOTE: for simplicity, we ignore cases where the data is only partially
      // inside the window
      if (receivedData.length > this.recvWindow) {
        throw new Error("buffer overflow");
      }
      this.readBuffer.write(receivedData);
      this.recvNext = receivedSegment.sequenceNumber + receivedData.length;
      this.recvWindow = MAX_BUFFER_SIZE - this.readBuffer.bytesAvailable();
    }

    // If FIN, mark read end as closed
    if (receivedSegment.flags.fin) {
      this.readClosed = true;
    }
    return true;
  }

  read(output: Uint8Array): number {
    const readLength = this.readBuffer.read(output);
    if (readLength === 0 && this.readClosed) {
      return -1;
    }
    return readLength;
  }

  write(input: Uint8Array): number {
    if (this.writeClosed) {
      throw new Error("write closed");
    }
    const writeLength = this.writeBuffer.write(input);
    if (this.sendWindow > 0 && writeLength > 0) {
      this.sendSegment(this.produceSegment());
    }
    return writeLength;
  }

  closeWrite() {
    this.writeClosed = true;
    const segment = this.newSegment(this.sendNext, this.recvNext).withFlags(
      new Flags().withFin().withAck(),
    );
    this.sendNext++;
    this.sendSegment(segment);
  }

  // utils

  private newSegment(seqNum: number, ackNum: number) {
    return new TcpSegment(this.srcPort, this.dstPort, seqNum, ackNum);
  }

  private produceSegment() {
    const segment = this.newSegment(this.sendNext, this.recvNext).withFlags(
      new Flags().withAck(),
    );

    if (this.writeBuffer.bytesAvailable() > 0 && this.sendWindow > 0) {
      const data = new Uint8Array(this.sendWindow);
      const writeLength = this.writeBuffer.read(data);
      segment.withData(data.subarray(0, writeLength));
      this.sendNext += writeLength;
      this.sendWindow -= writeLength;
    }
    return segment;
  }

  private isSeqNumValid(segSeq: number, segLen: number) {
    const lengthIsZero = segLen === 0;
    const windowIsZero = this.recvWindow === 0;

    if (lengthIsZero && windowIsZero) {
      return segSeq === this.recvNext;
    } else if (lengthIsZero && !windowIsZero) {
      return this.isInReceiveWindow(segSeq);
    } else if (!lengthIsZero && windowIsZero) {
      return false;
    } else {
      return (
        this.isInReceiveWindow(segSeq) ||
        this.isInReceiveWindow(segSeq + segLen - 1)
      );
    }
  }

  private isInReceiveWindow(n: number) {
    return this.recvNext <= n && n < this.recvNext + this.recvWindow;
  }

  private recvAck(segment: TcpSegment) {
    // From https://datatracker.ietf.org/doc/html/rfc9293#section-3.10.7.4-2.5.2.2.2.3.1
    // If the ACK is for a packet not yet sent, drop it
    if (this.sendNext < segment.acknowledgementNumber) {
      return false;
    }
    // If SND.UNA < SEG.ACK =< SND.NXT, set SND.UNA <- SEG.ACK
    if (this.sendUnacknowledged <= segment.acknowledgementNumber) {
      this.sendUnacknowledged = segment.acknowledgementNumber;
      if (this.isSegmentNewer(segment)) {
        // set SND.WND <- SEG.WND, set SND.WL1 <- SEG.SEQ, and set SND.WL2 <- SEG.ACK.
        this.sendWindow = segment.window;
        this.seqNumForLastWindowUpdate = segment.sequenceNumber;
        this.ackNumForLastWindowUpdate = segment.acknowledgementNumber;
      }
    }
  }

  private isSegmentNewer(segment: TcpSegment): boolean {
    // Since both SEQ and ACK numbers are monotonic, we can use
    // them to determine if the segment is newer than the last
    // one that was used for updating the window
    //
    // SND.WL1 < SEG.SEQ or (SND.WL1 = SEG.SEQ and SND.WL2 =< SEG.ACK)
    return (
      this.seqNumForLastWindowUpdate < segment.sequenceNumber ||
      (this.seqNumForLastWindowUpdate === segment.sequenceNumber &&
        this.ackNumForLastWindowUpdate <= segment.acknowledgementNumber)
    );
  }
}

interface RetransmissionQueueItem {
  segment: TcpSegment;
  timeoutPromise: Promise<void>;
}

function sleep(ms?: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const RETRANSMIT_TIMEOUT = 60 * 1000;

class RetransmissionQueue {
  private queue: RetransmissionQueueItem[] = [];

  push(segment: TcpSegment) {
    const timeoutPromise = sleep(RETRANSMIT_TIMEOUT);
    // Inserts the segment at the beginning of the queue
    this.queue.unshift({ segment, timeoutPromise });
  }

  async pop() {
    if (this.isEmpty()) {
      return null;
    }
    const item = this.queue.shift();
    await item.timeoutPromise;
    return item.segment;
  }

  isEmpty() {
    return this.queue.length === 0;
  }
}

class BytesBuffer {
  private buffer: Uint8Array;
  private length: number;

  constructor(size: number) {
    this.buffer = new Uint8Array(size);
    this.length = 0;
  }

  read(output: Uint8Array): number {
    const readLength = Math.min(this.length, output.length);
    if (readLength == 0) {
      return 0;
    }
    output.set(this.buffer.subarray(0, readLength));
    this.buffer.copyWithin(0, readLength, this.length);
    this.length -= readLength;
    return readLength;
  }

  write(data: Uint8Array): number {
    const newLength = this.length + data.length;
    if (newLength > this.buffer.length) {
      return 0;
    }
    this.buffer.set(data, this.length);
    this.length = newLength;
    return data.length;
  }

  bytesAvailable() {
    return this.length;
  }

  isEmpty() {
    return this.bytesAvailable() === 0;
  }
}

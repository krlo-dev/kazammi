// AudioWorkletProcessor of the capture module (specs/07-capture/design.md).
// Plain JavaScript in public/ because audioWorklet.addModule() needs a URL.
// Downmixes every 128-frame render quantum to mono and posts it to the main thread.

class RecorderProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const channels = inputs[0];
    if (channels && channels.length > 0) {
      const frames = channels[0].length;
      const mono = new Float32Array(frames);
      for (const channel of channels) {
        for (let i = 0; i < frames; i++) mono[i] += channel[i];
      }
      if (channels.length > 1) {
        for (let i = 0; i < frames; i++) mono[i] /= channels.length;
      }
      this.port.postMessage(mono, [mono.buffer]);
    }
    // Keep the processor alive until the node is disconnected.
    return true;
  }
}

registerProcessor("kazammi-recorder", RecorderProcessor);

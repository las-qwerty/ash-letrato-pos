const GZIP = 'ASHBK1.';
const PLAIN = 'ASHBK0.';

const toBase64 = (bytes: Uint8Array) => {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};

const fromBase64 = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

const transform = async (bytes: Uint8Array, stream: CompressionStream | DecompressionStream) =>
  new Uint8Array(await new Response(new Blob([new Uint8Array(bytes)]).stream().pipeThrough(stream)).arrayBuffer());

export async function packBackup(json: string): Promise<string> {
  const bytes = new TextEncoder().encode(json);
  if (typeof CompressionStream === 'undefined') return PLAIN + toBase64(bytes);
  return GZIP + toBase64(await transform(bytes, new CompressionStream('gzip')));
}

export async function unpackBackup(text: string): Promise<string> {
  const t = text.trim();
  if (t.startsWith('{')) return t;
  if (t.startsWith(PLAIN)) return new TextDecoder().decode(fromBase64(t.slice(PLAIN.length)));
  if (t.startsWith(GZIP)) {
    return new TextDecoder().decode(await transform(fromBase64(t.slice(GZIP.length)), new DecompressionStream('gzip')));
  }
  throw new Error('That is not an ASH LETRATO backup. Copy it again from Settings → Data.');
}

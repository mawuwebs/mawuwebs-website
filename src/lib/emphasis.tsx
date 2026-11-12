/** Strips `*word*` emphasis markers from admin-edited text. */
export function renderEmphasis(text: string): string {
  return text.replace(/\*([^*]+)\*/g, "$1");
}

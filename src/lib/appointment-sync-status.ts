export function isVideoReady(status: string | undefined, meetLink: string | undefined) {
  return status === "Sincronizado" && Boolean(meetLink);
}

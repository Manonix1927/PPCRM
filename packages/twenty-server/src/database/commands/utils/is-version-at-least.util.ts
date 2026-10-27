const parseVersion = (version: string): number[] =>
  version.split('.').map((part) => parseInt(part, 10) || 0);

export const isVersionAtLeast = (version: string, floor: string): boolean => {
  const parsedVersion = parseVersion(version);
  const parsedFloor = parseVersion(floor);

  for (
    let index = 0;
    index < Math.max(parsedVersion.length, parsedFloor.length);
    index++
  ) {
    const versionPart = parsedVersion[index] ?? 0;
    const floorPart = parsedFloor[index] ?? 0;

    if (versionPart !== floorPart) {
      return versionPart > floorPart;
    }
  }

  return true;
};

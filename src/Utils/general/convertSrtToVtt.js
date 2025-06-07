import fs from "fs";

export async function convertSRTtoVTT(srtPath, vttPath) {
  try {
    const srt = await fs.readFileSync(srtPath, "utf8");

    const vtt =
      "WEBVTT\n\n" +
      srt
        .replace(/\r+/g, "")
        .replace(/^\d+\n/gm, "") // remove index numbers
        .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2"); // convert , to .

    await fs.writeFileSync(vttPath, vtt, "utf8");
  } catch (error) {
    console.error("Error converting SRT to VTT:", error);
    throw error;
  }
}

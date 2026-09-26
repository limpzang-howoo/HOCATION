// 사진 목록을 ZIP으로 묶어 바로 다운로드. name에 "/"를 넣으면 zip 안에 하위 폴더가 생김.
export type ZipEntry = { url: string; name: string };

export async function zipAndDownload(entries: ZipEntry[], zipName: string): Promise<void> {
  if (entries.length === 0) throw new Error("다운로드할 사진이 없습니다");
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  const results = await Promise.all(
    entries.map(async (e) => {
      const res = await fetch(e.url);
      if (!res.ok) throw new Error("사진을 불러오지 못했습니다");
      const blob = await res.blob();
      return { name: e.name, blob };
    })
  );
  results.forEach(({ name, blob }) => zip.file(name, blob));

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${zipName}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

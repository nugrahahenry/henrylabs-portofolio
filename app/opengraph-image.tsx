import { ImageResponse } from "next/og";

export const alt = "HenryLabs - Useful Worlds";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          position: "relative",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          padding: "64px",
          flexDirection: "column",
          justifyContent: "space-between",
          color: "#f4f5ef",
          background: "radial-gradient(circle at 72% 35%, #28336c 0, #11183c 34%, #07091b 82%)",
          fontFamily: "Arial",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px", color: "#6ee7f4", fontSize: 22, letterSpacing: "0.12em" }}>
          <span style={{ fontSize: 34 }}>*</span>
          <span>HENRYLABS / USEFUL WORLDS</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxWidth: "850px" }}>
          <div style={{ display: "flex", color: "#efc95f", fontSize: 88, fontWeight: 700, lineHeight: 0.92, letterSpacing: "-0.06em" }}>I build things</div>
          <div style={{ display: "flex", color: "#f4f5ef", fontSize: 88, fontWeight: 700, lineHeight: 0.92, letterSpacing: "-0.06em" }}>I actually see.</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", color: "#aeb8b1", fontSize: 20 }}>
          <span>Product-minded developer / Indonesia</span>
          <span style={{ color: "#6ee7f4" }}>built by Henry *</span>
        </div>
        <div style={{ position: "absolute", right: 90, top: 144, width: 300, height: 300, border: "1px solid rgba(110,231,244,.4)", borderRadius: "50%" }} />
        <div style={{ position: "absolute", right: 230, top: 274, width: 18, height: 18, borderRadius: "50%", background: "#ee674f", boxShadow: "0 0 30px #ee674f" }} />
        <div style={{ position: "absolute", right: 132, top: 184, width: 12, height: 12, borderRadius: "50%", background: "#efc95f", boxShadow: "0 0 22px #efc95f" }} />
      </div>
    ),
    { ...size },
  );
}

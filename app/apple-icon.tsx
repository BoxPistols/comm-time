import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #6366f1 0%, #9333ea 100%)",
          borderRadius: "40px",
        }}
      >
        <div
          style={{
            width: "160px",
            height: "160px",
            background: "white",
            borderRadius: "80px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          {/* Clock face center */}
          <div
            style={{
              width: "12px",
              height: "12px",
              background: "#6366f1",
              borderRadius: "6px",
              position: "absolute",
            }}
          />
          {/* Hour hand */}
          <div
            style={{
              width: "8px",
              height: "50px",
              background: "#6366f1",
              borderRadius: "4px",
              position: "absolute",
              top: "30px",
              transformOrigin: "center bottom",
            }}
          />
          {/* Minute hand */}
          <div
            style={{
              width: "6px",
              height: "35px",
              background: "#9333ea",
              borderRadius: "3px",
              position: "absolute",
              right: "42px",
              transform: "rotate(90deg)",
              transformOrigin: "center right",
            }}
          />
          {/* Hour markers */}
          <div
            style={{
              width: "8px",
              height: "8px",
              background: "#6366f1",
              borderRadius: "4px",
              position: "absolute",
              top: "12px",
            }}
          />
          <div
            style={{
              width: "8px",
              height: "8px",
              background: "#6366f1",
              borderRadius: "4px",
              position: "absolute",
              right: "12px",
            }}
          />
          <div
            style={{
              width: "8px",
              height: "8px",
              background: "#6366f1",
              borderRadius: "4px",
              position: "absolute",
              bottom: "12px",
            }}
          />
          <div
            style={{
              width: "8px",
              height: "8px",
              background: "#6366f1",
              borderRadius: "4px",
              position: "absolute",
              left: "12px",
            }}
          />
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

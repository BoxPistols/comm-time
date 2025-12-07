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
          background: "linear-gradient(135deg, #fb923c 0%, #ea580c 100%)",
          borderRadius: "40px",
        }}
      >
        <div
          style={{
            width: "120px",
            height: "120px",
            background: "white",
            borderRadius: "60px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          {/* Clock face center */}
          <div
            style={{
              width: "10px",
              height: "10px",
              background: "#ea580c",
              borderRadius: "5px",
              position: "absolute",
            }}
          />
          {/* Hour hand */}
          <div
            style={{
              width: "6px",
              height: "38px",
              background: "#ea580c",
              borderRadius: "3px",
              position: "absolute",
              top: "22px",
              transformOrigin: "center bottom",
            }}
          />
          {/* Minute hand */}
          <div
            style={{
              width: "5px",
              height: "28px",
              background: "#f97316",
              borderRadius: "3px",
              position: "absolute",
              right: "31px",
              transform: "rotate(90deg)",
              transformOrigin: "center right",
            }}
          />
          {/* Hour markers */}
          <div
            style={{
              width: "6px",
              height: "6px",
              background: "#ea580c",
              borderRadius: "3px",
              position: "absolute",
              top: "8px",
            }}
          />
          <div
            style={{
              width: "6px",
              height: "6px",
              background: "#ea580c",
              borderRadius: "3px",
              position: "absolute",
              right: "8px",
            }}
          />
          <div
            style={{
              width: "6px",
              height: "6px",
              background: "#ea580c",
              borderRadius: "3px",
              position: "absolute",
              bottom: "8px",
            }}
          />
          <div
            style={{
              width: "6px",
              height: "6px",
              background: "#ea580c",
              borderRadius: "3px",
              position: "absolute",
              left: "8px",
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

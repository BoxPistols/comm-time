import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: "6px",
        }}
      >
        <div
          style={{
            width: "26px",
            height: "26px",
            background: "white",
            borderRadius: "13px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          {/* Clock face center */}
          <div
            style={{
              width: "3px",
              height: "3px",
              background: "#ea580c",
              borderRadius: "2px",
              position: "absolute",
            }}
          />
          {/* Hour hand */}
          <div
            style={{
              width: "2px",
              height: "8px",
              background: "#ea580c",
              borderRadius: "1px",
              position: "absolute",
              top: "5px",
              transformOrigin: "center bottom",
            }}
          />
          {/* Minute hand */}
          <div
            style={{
              width: "2px",
              height: "6px",
              background: "#f97316",
              borderRadius: "1px",
              position: "absolute",
              right: "7px",
              transform: "rotate(90deg)",
              transformOrigin: "center right",
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

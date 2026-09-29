import type { FindEventTicketsQuery } from "@/types/__generated__/graphql";

// The seat map as findEventTickets returns it.
type SeatMapLayout = NonNullable<
  FindEventTicketsQuery["findEventTickets"]["seatMap"]
>;

// The "Concentric Arena" layout seeded by
// apps/api/src/module/catalog/persistence/migration/1790550000000-migration.ts
// and moved to shape lists by 1790600000000-migration.ts, mapped to the
// findEventTickets GraphQL shape.
export const concentricSeatMap: SeatMapLayout = {
  __typename: "SeatMap",
  id: "11111111-1111-4111-8111-111111111111",
  name: "Concentric Arena",
  viewBoxWidth: 704,
  viewBoxHeight: 704,
  labelSize: 24,
  labelWeight: 700,
  stage: {
    __typename: "SeatMapStage",
    label: "STAGE",
    labelX: 352,
    labelY: 89,
    shapes: [
      {
        __typename: "SeatMapStageShape",
        path: "M116.5 90C171 35.5 267.632 0.58 349.542 0.008C431.452 -0.564 526.5 28.5 586 90L469.911 207.426C436.268 179.988 394.109 165.141 350.697 165.444C307.285 165.747 265.338 181.181 232.081 209.086L116.5 90Z",
        color: "#999999",
      },
    ],
  },
  sections: [
    {
      __typename: "SeatMapSection",
      key: "vip",
      label: "VIP",
      color: "#454545",
      shapes: [
        {
          __typename: "SeatMapSectionShape",
          path: "M183.467 352 A168.533 168.533 0 1 0 520.533 352 A168.533 168.533 0 1 0 183.467 352 Z",
          labelX: 352,
          labelY: 352,
          labelRotation: 0,
        },
      ],
    },
    {
      __typename: "SeatMapSection",
      key: "a",
      label: "A",
      color: "#303030",
      shapes: [
        {
          __typename: "SeatMapSectionShape",
          path: "M516.057 189.092C548.391 221.425 570.41 262.621 579.331 307.469C588.252 352.317 583.673 398.804 566.175 441.05C548.676 483.296 519.042 519.404 481.022 544.808C443.002 570.213 398.302 583.772 352.575 583.772C306.848 583.772 262.148 570.213 224.128 544.809C186.107 519.404 156.474 483.296 138.975 441.05C121.476 398.804 116.898 352.318 125.818 307.469C134.739 262.621 156.759 221.426 189.092 189.092L221.789 221.788C195.922 247.655 178.306 280.612 171.17 316.49C164.033 352.369 167.696 389.558 181.695 423.355C195.694 457.151 219.401 486.038 249.817 506.362C280.234 526.685 315.994 537.533 352.575 537.533C389.156 537.533 424.916 526.685 455.333 506.361C485.749 486.038 509.456 457.151 523.455 423.354C537.454 389.558 541.117 352.369 533.98 316.49C526.843 280.611 509.228 247.655 483.361 221.788L516.057 189.092Z",
          labelX: 352,
          labelY: 562,
          labelRotation: 0,
        },
      ],
    },
    {
      __typename: "SeatMapSection",
      key: "b",
      label: "B",
      color: "#1F1F1F",
      shapes: [
        {
          __typename: "SeatMapSectionShape",
          path: "M556.755 147.242C597.253 187.74 624.832 239.338 636.006 295.51C647.179 351.682 641.445 409.906 619.527 462.819C597.61 515.733 560.494 560.958 512.874 592.777C465.253 624.596 409.266 641.58 351.994 641.58C294.721 641.58 238.734 624.596 191.114 592.777C143.493 560.958 106.377 515.733 84.46 462.82C62.543 409.907 56.808 351.682 67.981 295.51C79.154 239.338 106.734 187.74 147.232 147.242L179.994 180.004C145.975 214.022 122.809 257.364 113.423 304.549C104.038 351.734 108.855 400.642 127.265 445.089C145.676 489.536 176.853 527.526 216.854 554.254C256.856 580.982 303.885 595.248 351.994 595.247C400.103 595.247 447.131 580.981 487.133 554.253C527.134 527.525 558.311 489.536 576.722 445.089C595.132 400.642 599.949 351.734 590.564 304.549C581.178 257.364 558.011 214.022 523.993 180.004L556.755 147.242Z",
          labelX: 352,
          labelY: 623,
          labelRotation: 0,
        },
      ],
    },
    {
      __typename: "SeatMapSection",
      key: "c",
      label: "C",
      color: "#191919",
      shapes: [
        {
          __typename: "SeatMapSectionShape",
          path: "M600.902 103.098C650.13 152.327 683.655 215.047 697.237 283.328C710.819 351.61 703.848 422.385 677.206 486.705C650.564 551.024 605.447 605.999 547.561 644.677C489.675 683.355 421.619 704 352 704C282.381 704 214.326 683.356 156.44 644.677C98.554 605.999 53.437 551.024 26.795 486.705C0.153 422.385 -6.818 351.61 6.764 283.329C20.346 215.047 53.87 152.327 103.098 103.099L137.944 137.945C95.608 180.281 66.777 234.221 55.097 292.943C43.416 351.665 49.411 412.531 72.323 467.846C95.236 523.161 134.036 570.439 183.818 603.703C233.6 636.966 292.128 654.72 352 654.72C411.873 654.72 470.4 636.966 520.182 603.702C569.964 570.439 608.765 523.161 631.677 467.846C654.589 412.531 660.584 351.664 648.903 292.942C637.223 234.22 608.392 180.281 566.056 137.945L600.902 103.098Z",
          labelX: 352,
          labelY: 684,
          labelRotation: 0,
        },
      ],
    },
  ],
};

// A small stadium-like layout: VIP is drawn as two blocks with labels rotated
// -90 and 90 degrees, and the stage (pitch plus a strip) has no label.
export const multiShapeSeatMap: SeatMapLayout = {
  __typename: "SeatMap",
  id: "22222222-2222-4222-8222-222222222222",
  name: "Mini Stadium",
  viewBoxWidth: 400,
  viewBoxHeight: 300,
  labelSize: 16,
  labelWeight: 400,
  stage: {
    __typename: "SeatMapStage",
    label: null,
    labelX: null,
    labelY: null,
    shapes: [
      {
        __typename: "SeatMapStageShape",
        path: "M140 110L260 110L260 190L140 190Z",
        color: "#999999",
      },
      {
        __typename: "SeatMapStageShape",
        path: "M140 95L260 95L260 105L140 105Z",
        color: "#454545",
      },
    ],
  },
  sections: [
    {
      __typename: "SeatMapSection",
      key: "t.gold",
      label: "T.GOLD",
      color: "#303030",
      shapes: [
        {
          __typename: "SeatMapSectionShape",
          path: "M100 20L195 20L195 80L100 80Z",
          labelX: 147.5,
          labelY: 50,
          labelRotation: 0,
        },
        {
          __typename: "SeatMapSectionShape",
          path: "M205 20L300 20L300 80L205 80Z",
          labelX: 252.5,
          labelY: 51,
          labelRotation: 0,
        },
      ],
    },
    {
      __typename: "SeatMapSection",
      key: "vip",
      label: "VIP",
      color: "#454545",
      shapes: [
        {
          __typename: "SeatMapSectionShape",
          path: "M60 100L120 100L120 200L60 200Z",
          labelX: 90,
          labelY: 150,
          labelRotation: -90,
        },
        {
          __typename: "SeatMapSectionShape",
          path: "M280 100L340 100L340 200L280 200Z",
          labelX: 310,
          labelY: 152,
          labelRotation: 90,
        },
      ],
    },
    {
      __typename: "SeatMapSection",
      key: "b.gold",
      label: "B.GOLD",
      color: "#1F1F1F",
      shapes: [
        {
          __typename: "SeatMapSectionShape",
          path: "M100 220L300 220L300 280L100 280Z",
          labelX: 200,
          labelY: 250,
          labelRotation: 0,
        },
      ],
    },
  ],
};

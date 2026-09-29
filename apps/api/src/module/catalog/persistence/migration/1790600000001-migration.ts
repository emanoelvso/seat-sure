import { MigrationInterface, QueryRunner } from 'typeorm';

const SEAT_MAP_ID = '22222222-2222-4222-8222-222222222222';

const LAYOUT = `{"viewBox":{"width":704,"height":860},"labelStyle":{"size":16,"weight":400},"stage":{"label":null,"labelAt":null,"shapes":[{"path":"M218.518 337.678L500.107 339.271C505.513 339.301 509.869 343.709 509.836 349.116L508.936 496.696C508.903 502.102 504.493 506.46 499.087 506.43L217.498 504.837C212.092 504.807 207.736 500.399 207.769 494.993L208.669 347.412C208.702 342.006 213.112 337.648 218.518 337.678Z","color":"#999999"},{"path":"M216.173 309.186C220.966 317.719 223.76 322.912 223.76 322.912L498.982 324.469C502.164 315.26 501.239 320.025 504.421 310.816C507.603 301.607 510.243 283.111 510.243 283.111L209.075 281.408C209.075 281.408 211.38 300.652 216.173 309.186Z","color":"#454545"},{"path":"M216.338 533.302C221.234 524.824 224.092 519.662 224.092 519.662L499.314 521.219C502.383 530.463 501.517 525.688 504.586 534.933C507.656 544.177 510.069 562.701 510.069 562.701L208.902 560.998C208.902 560.998 211.442 541.781 216.338 533.302Z","color":"#454545"}]},"sections":[{"key":"t.standard","label":"T.STANDARD","color":"#1B1B1B","shapes":[{"path":"M158.942 58.2881L201.708 118.324C113.986 167.844 83.1321 238.37 81.1948 303.417L8.41171 303.006C18.755 185.733 105.597 91.08 158.942 58.2881Z","labelAt":[96.8,172.3],"labelRotation":-57},{"path":"M550.653 55.5819L508.398 114.886C380.935 41.974 258.258 83.3916 212.852 113.214L169.787 53.4279C295.175 -25.0075 453.802 -7.83717 550.653 55.5819Z","labelAt":[362.2,40.6],"labelRotation":0},{"path":"M554.969 60.5269L511.474 120.075C598.585 170.584 628.576 241.453 629.72 306.519L702.503 306.93C693.591 189.548 607.91 93.9199 554.969 60.5269Z","labelAt":[625.4,185.7],"labelRotation":55}]},{"key":"t.bronz","label":"T.BRONZ","color":"#242424","shapes":[{"path":"M246.903 188.228C213.02 206.791 190.569 228.804 190.34 266.312L104.676 265.828C109.076 202.375 154.825 157.046 206.131 132.522L246.903 188.228Z","labelAt":[172.6,194.5],"labelRotation":-61},{"path":"M492.204 128.964L455.743 183.493C396.346 154.68 320.641 153.142 257.433 182.001L223.945 127.447C257.896 106.188 307.492 90.9358 360.99 91.2383C414.488 91.5409 469.241 112.931 492.204 128.964Z","labelAt":[362.4,130],"labelRotation":0},{"path":"M471.24 189.496C504.895 208.441 527.076 230.707 526.847 268.215L612.51 268.699C608.885 205.201 563.693 159.357 512.689 134.255L471.24 189.496Z","labelAt":[547.7,214.4],"labelRotation":59}]},{"key":"t.gold","label":"T.GOLD","color":"#303030","shapes":[{"path":"M510.347 266.102C510.481 244.131 494.745 222.971 466.599 207.276C438.454 191.58 400.206 182.636 360.269 182.41C320.332 182.184 281.977 190.696 253.642 206.071C225.307 221.447 209.314 242.428 209.18 264.398L359.763 265.25L510.347 266.102Z","labelAt":[356.4,232.8],"labelRotation":0}]},{"key":"l.bronz","label":"L.BRONZ","color":"#242424","shapes":[{"path":"M77.4659 318.387L76.1119 540.279L1.58838 539.857L2.94237 317.965L77.4659 318.387Z","labelAt":[35.6,429.7],"labelRotation":-90}]},{"key":"vip","label":"VIP","color":"#454545","shapes":[{"path":"M132.427 279.364C116.546 279.274 103.592 292.076 103.495 307.957L102.026 548.776C101.929 564.657 114.725 577.605 130.607 577.695L185.906 578.007L187.726 279.677L132.427 279.364Z","labelAt":[143.6,429],"labelRotation":-90},{"path":"M583.063 281.919C598.945 282.009 611.741 294.956 611.644 310.837L610.175 551.656C610.078 567.538 597.124 580.34 581.243 580.25L531.322 579.967L533.142 281.637L583.063 281.919Z","labelAt":[571.7,432.2],"labelRotation":90}]},{"key":"r.bronz","label":"R.BRONZ","color":"#242424","shapes":[{"path":"M702.079 321.92L700.725 543.813L628.506 543.404L629.86 321.512L702.079 321.92Z","labelAt":[666.4,447.7],"labelRotation":90}]},{"key":"b.gold","label":"B.GOLD","color":"#303030","shapes":[{"path":"M506.836 589.314C506.702 611.285 490.708 632.266 462.374 647.641C434.039 663.017 395.684 671.528 355.747 671.302C315.81 671.077 277.561 662.132 249.416 646.437C221.271 630.742 205.535 609.581 205.669 587.611L356.252 588.463L506.836 589.314Z","labelAt":[356.8,624.5],"labelRotation":0}]},{"key":"b.bronz","label":"B.BRONZ","color":"#242424","shapes":[{"path":"M238.573 672.121C204.919 653.176 182.738 630.91 182.967 593.402L97.3032 592.918C100.928 656.416 146.121 702.26 197.124 727.362L238.573 672.121Z","labelAt":[158.6,651.2],"labelRotation":53},{"path":"M483.133 734.155L447.341 679.217C387.597 707.357 311.878 708.038 249.027 678.466L214.874 732.638C248.564 754.279 297.97 770.091 351.468 770.394C404.966 770.696 459.977 749.927 483.133 734.155Z","labelAt":[363.2,730.7],"labelRotation":0},{"path":"M462.909 673.391C496.792 654.828 519.243 632.814 519.472 595.306L605.135 595.791C600.736 659.243 554.987 704.573 503.68 729.097L462.909 673.391Z","labelAt":[533.5,661.8],"labelRotation":-58}]},{"key":"b.standard","label":"B.STANDARD","color":"#191919","shapes":[{"path":"M149.032 801.055L192.527 741.507C105.416 690.998 75.4248 620.128 74.2814 555.063L1.49839 554.651C10.4098 672.033 96.0907 767.662 149.032 801.055Z","labelAt":[88,688],"labelRotation":47},{"path":"M536.491 806.572L494.956 746.79C366.62 818.242 244.452 775.428 199.41 745.089L155.625 804.38C280.056 884.24 438.88 868.882 536.491 806.572Z","labelAt":[335.3,821.2],"labelRotation":0},{"path":"M545.059 803.293L502.293 743.257C590.015 693.736 620.869 623.211 622.806 558.163L695.589 558.575C685.246 675.848 598.404 770.501 545.059 803.293Z","labelAt":[623.7,662.1],"labelRotation":-51}]}]}`;

export class Migration1790600000001 implements MigrationInterface {
  name = 'Migration1790600000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      INSERT INTO "SeatMap" ("id", "name", "venueId", "layout")
      VALUES ($1, 'Football Stadium', NULL, $2::jsonb)
    `,
      [SEAT_MAP_ID, LAYOUT],
    );

    await queryRunner.query(
      `
      UPDATE "Event"
      SET "seatMapId" = $1
      WHERE "type" = 'sport' AND "category" = 'Football' AND "status" = 'published'
    `,
      [SEAT_MAP_ID],
    );

    await queryRunner.query(`
      INSERT INTO "TicketType" ("id", "sectionKey", "name", "priceCents", "currency", "seatsAvailable", "maxPerOrder", "tags", "eventId")
      SELECT gen_random_uuid(), v."sectionKey", v."name", v."priceCents", 'USD', v."seatsAvailable", v."maxPerOrder", v."tags", e.id
      FROM "Event" e
      CROSS JOIN (VALUES
        ('vip', 'VIP', 40000, 60, 8, 'discounted,vip'),
        ('t.gold', 'T.GOLD', 32500, 150, 8, 'discounted,vip'),
        ('b.gold', 'B.GOLD', 32500, 150, 8, 'discounted,vip'),
        ('t.bronz', 'T.BRONZ', 30000, 400, 8, 'discounted'),
        ('b.bronz', 'B.BRONZ', 30000, 400, 8, 'discounted'),
        ('l.bronz', 'L.BRONZ', 30000, 400, 8, 'discounted'),
        ('r.bronz', 'R.BRONZ', 30000, 400, 8, 'discounted'),
        ('t.standard', 'T.STANDARD', 20000, 900, 8, 'discounted'),
        ('b.standard', 'B.STANDARD', 20000, 900, 8, 'discounted')
      ) AS v("sectionKey", "name", "priceCents", "seatsAvailable", "maxPerOrder", "tags")
      WHERE e."type" = 'sport' AND e."category" = 'Football' AND e."status" = 'published'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      DELETE FROM "TicketType"
      WHERE "eventId" IN (SELECT id FROM "Event" WHERE "seatMapId" = $1)
    `,
      [SEAT_MAP_ID],
    );

    await queryRunner.query(
      `
      UPDATE "Event"
      SET "seatMapId" = NULL
      WHERE "seatMapId" = $1
    `,
      [SEAT_MAP_ID],
    );

    await queryRunner.query(
      `
      DELETE FROM "SeatMap" WHERE "id" = $1
    `,
      [SEAT_MAP_ID],
    );
  }
}

import { transaction, runCli } from './database.mjs';

// Reserved sample namespace; independent of load-test events and visitor IDs.
const id = (n) => `d3000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export const ids = { venue: id(1), map: id(2), artist: id(3), event: id(4), ticket: id(5), performance: id(6) };
const layout = {
  viewBox: { width: 704, height: 704 }, labelStyle: { size: 24, weight: 700 },
  stage: { label: 'STAGE', labelAt: [352, 70], shapes: [{ path: 'M180 30H524V110H180Z', color: '#9a76ff' }] },
  sections: [{ key: 'floor', label: 'FLOOR', color: '#9564ff', shapes: [{ path: 'M140 190H564V570H140Z', labelAt: [352, 610], labelRotation: 0 }] }],
};
export async function seedCatalog(client, now = Date.now()) {
  const start = new Date(now + 30 * 86400000);
  await client.query(`INSERT INTO "CatalogVenue" (id,name,address,city,state,country,latitude,longitude,capacity) VALUES ($1,'Signal Hall','12 Demo Avenue','Sao Paulo','SP','Brazil',-23.55,-46.63,24) ON CONFLICT (id) DO NOTHING`, [ids.venue]);
  await client.query(`INSERT INTO "CatalogSeatMap" (id,name,layout,"venueId") VALUES ($1,'Signal Hall floor',$2,$3) ON CONFLICT (id) DO NOTHING`, [ids.map, JSON.stringify(layout), ids.venue]);
  await client.query(`INSERT INTO "CatalogArtist" (id,slug,stage_name,bio,cover_image_url,genres) VALUES ($1,'night-signals','Night Signals','An imaginary electronic ensemble created for this demo.','/demo/night-signals.svg','Electronic') ON CONFLICT (id) DO NOTHING`, [ids.artist]);
  await client.query(`INSERT INTO "CatalogEvent" (id,type,name,description,"coverImage",date,"startAt","endsAt","doorsOpen",status,category,price,"venueId","seatMapId",tags) VALUES ($1,'concert','Night Signals','An original imaginary concert for exploring Seat Sure.','/demo/night-signals.svg',$2,$2,$3,$4,'published','music',45,$5,$6,'demo') ON CONFLICT (id) DO UPDATE SET date=EXCLUDED.date,"startAt"=EXCLUDED."startAt","endsAt"=EXCLUDED."endsAt","doorsOpen"=EXCLUDED."doorsOpen"`, [ids.event, start, new Date(+start + 10800000), new Date(+start - 3600000), ids.venue, ids.map]);
  await client.query(`INSERT INTO "CatalogEventArtist" (id,headliner,performance_order,"eventId","artistId") VALUES ($1,true,1,$2,$3) ON CONFLICT (id) DO NOTHING`, [ids.performance, ids.event, ids.artist]);
  await client.query(`INSERT INTO "CatalogTicketType" (id,"eventId","sectionKey",name,"priceCents","serviceFeeCents","taxCents",currency,"seatsAvailable","maxPerOrder",tags) VALUES ($1,$2,'floor','Floor',4500,300,0,'USD',24,4,'demo') ON CONFLICT (id) DO NOTHING`, [ids.ticket, ids.event]);
  for (let n = 0; n < 24; n++) {
    await client.query(`INSERT INTO "CatalogSeat" (id,"seatMapId","sectionKey",row,number,x,y) VALUES ($1,$2,'floor',$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`, [id(100 + n), ids.map, String.fromCharCode(65 + Math.floor(n / 8)), String(n % 8 + 1).padStart(2, '0'), 180 + (n % 8) * 48, 250 + Math.floor(n / 8) * 100]);
  }
}
export const seed = (env = process.env) => transaction(env, seedCatalog);
runCli(import.meta.url, () => seed());

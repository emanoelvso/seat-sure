import { MigrationInterface, QueryRunner } from 'typeorm';

// Seeds one CatalogVenue per venue named by the event seeds
// (1789400000000, 1790023000000). "Engenhão" is the nickname of Estádio
// Nilton Santos, so both events share that venue: 29 venues for 30 names.
// Names, cities and countries are copied from the event seeds, so the venue
// reference migration can match events by name and city.
//
// Values come from public sources, looked up on 2026-09-29. Capacity is
// approximate: stadiums use their seated capacity, arenas and halls their
// largest listed configuration, and open-air sites the reported attendance or
// capacity of the event they host. Coordinates are decimal conversions of the
// source's degrees/minutes/seconds, unless the source gives decimals.
//
// Sources:
// 01 Allianz Parque: en.wikipedia.org/wiki/Allianz_Parque
// 02 Estádio Nilton Santos: en.wikipedia.org/wiki/Estádio_Olímpico_Nilton_Santos;
//    address from casamineira.com.br and tripadvisor.com (Rua José dos Reis, 425)
// 03 Jeunesse Arena: en.wikipedia.org/wiki/Jeunesse_Arena (concert capacity)
// 04 Estádio MorumBIS: en.wikipedia.org/wiki/Morumbi_Stadium
// 05 Pavilhão do Anhembi: pt.wikipedia.org/wiki/Anhembi_Parque (complex show
//    capacity); address from distritoanhembi.com.br (folheto do pavilhão)
// 06 Tokio Marine Hall: pt.wikipedia.org/wiki/Tokio_Marine_Hall
// 07 Teatro Renault: pt.wikipedia.org/wiki/Teatro_Renault; address from
//    guiadasemana.com.br and infoteatro.com.br
// 08 Teatro Carlos Gomes: pt.wikipedia.org/wiki/Teatro_Carlos_Gomes_(Rio_de_Janeiro)
// 09 Ginásio do Ibirapuera: pt.wikipedia.org/wiki/Ginásio_do_Ibirapuera;
//    address from prefeitura.sp.gov.br and ticket360.com.br
// 10 Teatro Municipal: pt.wikipedia.org/wiki/Theatro_Municipal_de_São_Paulo;
//    address from prefeitura.sp.gov.br (Fundação Theatro Municipal)
// 11 Teatro Bradesco: pt.wikipedia.org/wiki/Teatro_Bradesco (capacity);
//    address from teatrobradesco.com.br; coordinates from tripadvisor.com
// 12 Vivo Rio: pt.wikipedia.org/wiki/Vivo_Rio; address from vivorio.com.br;
//    coordinates from bandsintown.com
// 13 Maracanã: en.wikipedia.org/wiki/Maracanã_Stadium; address from
//    wikidata.org/wiki/Q155174
// 14 Autódromo de Interlagos: en.wikipedia.org/wiki/Interlagos_Circuit;
//    address from autodromodeinterlagos.prefeitura.sp.gov.br; capacity is
//    Lollapalooza Brasil's daily attendance (rollingstone.com.br, 2023: ~100k/day)
// 15 Jockey Club Brasileiro: address from jcb.com.br; coordinates from Apple
//    Maps; capacity is the Rio Open centre court (rioopen.com, 6,200 seats)
// 16 Praia de Copacabana: pt.wikipedia.org/wiki/Praia_de_Copacabana; capacity
//    is Riotur's estimate for the 2025 Lady Gaga concert (riotur.prefeitura.rio)
// 17 Parque Ibirapuera: en.wikipedia.org/wiki/Ibirapuera_Park; capacity is the
//    TJ-SP limit for events at Praça da Paz (sedep.com.br)
// 18 Cidade do Rock: en.wikipedia.org/wiki/Barra_Olympic_Park (coordinates);
//    address from wegoout.com.br; capacity is Rock in Rio 2026 (rr.pt, 100k/day)
// 19 Parque Maeda: pt.wikipedia.org/wiki/Parque_Maeda; address from
//    tripadvisor.com; capacity is Tomorrowland Brasil 2025 (jornalexata.com.br, 60k/day)
// 20 Parque de Exposições (Salvador): wikidata.org/wiki/Q10345490; address from
//    afropunk.com; capacity is Afropunk Bahia 2022 (correio24horas.com.br, 25k/night)
// 21 Expo Center Norte: pt.wikipedia.org/wiki/Expo_Center_Norte; capacity is its
//    Convention Center (expocenternorte.com.br), the only published figure
// 22 Vila Germânica: pt.wikipedia.org/wiki/Parque_Vila_Germânica; address from
//    blumenau.sc.gov.br; capacity is the Oktoberfest limit (ndmais.com.br, 40,703)
// 23 The Colosseum at Caesars Palace: en.wikipedia.org/wiki/The_Colosseum_at_Caesars_Palace
// 24 Madison Square Garden: en.wikipedia.org/wiki/Madison_Square_Garden
// 25 The O2 Arena: en.wikipedia.org/wiki/The_O2_Arena
// 26 Estádio Nacional de Brasília: en.wikipedia.org/wiki/Estádio_Nacional_Mané_Garrincha
// 27 Arena Fonte Nova: en.wikipedia.org/wiki/Arena_Fonte_Nova
// 28 Estádio Beira-Rio: en.wikipedia.org/wiki/Estádio_Beira-Rio; address from
//    lance.com.br
// 29 Estádio Mineirão: en.wikipedia.org/wiki/Mineirão; address from mineirao.com.br
export class Migration1790697184776 implements MigrationInterface {
  name = 'Migration1790697184776';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "CatalogVenue" ("id", "name", "address", "city", "state", "country", "latitude", "longitude", "capacity")
      VALUES
        ('a0000000-0000-4000-8000-000000000001', 'Allianz Parque', 'Rua Palestra Itália, 200 - Perdizes', 'São Paulo', 'SP', 'Brazil', -23.527500, -46.678611, 43713),
        ('a0000000-0000-4000-8000-000000000002', 'Estádio Nilton Santos', 'Rua José dos Reis, 425 - Engenho de Dentro', 'Rio de Janeiro', 'RJ', 'Brazil', -22.893056, -43.292222, 46931),
        ('a0000000-0000-4000-8000-000000000003', 'Jeunesse Arena', 'Av. Embaixador Abelardo Bueno, 3401 - Barra da Tijuca', 'Rio de Janeiro', 'RJ', 'Brazil', -22.975278, -43.390278, 18768),
        ('a0000000-0000-4000-8000-000000000004', 'Estádio MorumBIS', 'Praça Roberto Gomes Pedrosa, 1 - Morumbi', 'São Paulo', 'SP', 'Brazil', -23.600125, -46.720156, 66795),
        ('a0000000-0000-4000-8000-000000000005', 'Pavilhão do Anhembi', 'Av. Olavo Fontoura, 1209 - Santana', 'São Paulo', 'SP', 'Brazil', -23.516389, -46.636111, 35000),
        ('a0000000-0000-4000-8000-000000000006', 'Tokio Marine Hall', 'Rua Bragança Paulista, 1281 - Santo Amaro', 'São Paulo', 'SP', 'Brazil', -23.638333, -46.720278, 4000),
        ('a0000000-0000-4000-8000-000000000007', 'Teatro Renault', 'Av. Brigadeiro Luís Antônio, 411 - Bela Vista', 'São Paulo', 'SP', 'Brazil', -23.554167, -46.638333, 1530),
        ('a0000000-0000-4000-8000-000000000008', 'Teatro Carlos Gomes', 'Praça Tiradentes, 19 - Centro', 'Rio de Janeiro', 'RJ', 'Brazil', -22.907222, -43.182500, 760),
        ('a0000000-0000-4000-8000-000000000009', 'Ginásio do Ibirapuera', 'Rua Manoel da Nóbrega, 1361 - Paraíso', 'São Paulo', 'SP', 'Brazil', -23.577778, -46.656111, 10200),
        ('a0000000-0000-4000-8000-000000000010', 'Teatro Municipal', 'Praça Ramos de Azevedo, s/n - República', 'São Paulo', 'SP', 'Brazil', -23.545278, -46.638611, 1523),
        ('a0000000-0000-4000-8000-000000000011', 'Teatro Bradesco', 'Rua Palestra Itália, 500 - Perdizes (Bourbon Shopping)', 'São Paulo', 'SP', 'Brazil', -23.526163, -46.680344, 1439),
        ('a0000000-0000-4000-8000-000000000012', 'Vivo Rio', 'Av. Infante Dom Henrique, 85 - Parque do Flamengo', 'Rio de Janeiro', 'RJ', 'Brazil', -22.913384, -43.171376, 4000),
        ('a0000000-0000-4000-8000-000000000013', 'Maracanã', 'Av. Presidente Castelo Branco, Portão 3 - Maracanã', 'Rio de Janeiro', 'RJ', 'Brazil', -22.912222, -43.230278, 73139),
        ('a0000000-0000-4000-8000-000000000014', 'Autódromo de Interlagos', 'Av. Senador Teotônio Vilela, 261 - Interlagos', 'São Paulo', 'SP', 'Brazil', -23.701111, -46.697222, 100000),
        ('a0000000-0000-4000-8000-000000000015', 'Jockey Club Brasileiro', 'Praça Santos Dumont, 31 - Gávea', 'Rio de Janeiro', 'RJ', 'Brazil', -22.974643, -43.223219, 6200),
        ('a0000000-0000-4000-8000-000000000016', 'Praia de Copacabana', 'Av. Atlântica - Copacabana', 'Rio de Janeiro', 'RJ', 'Brazil', -22.970833, -43.181667, 2100000),
        ('a0000000-0000-4000-8000-000000000017', 'Parque Ibirapuera', 'Av. Pedro Álvares Cabral, s/n - Ibirapuera', 'São Paulo', 'SP', 'Brazil', -23.588333, -46.658889, 30000),
        ('a0000000-0000-4000-8000-000000000018', 'Cidade do Rock', 'Av. Salvador Allende, 6500 - Barra da Tijuca', 'Rio de Janeiro', 'RJ', 'Brazil', -22.976944, -43.393889, 100000),
        ('a0000000-0000-4000-8000-000000000019', 'Parque Maeda', 'Rod. Dep. Archimedes Lammoglia, Km 18', 'Itu', 'SP', 'Brazil', -23.340319, -47.345958, 60000),
        ('a0000000-0000-4000-8000-000000000020', 'Parque de Exposições', 'Av. Luís Viana Filho, 1590 - Itapuã', 'Salvador', 'BA', 'Brazil', -12.923813, -38.362687, 25000),
        ('a0000000-0000-4000-8000-000000000021', 'Expo Center Norte', 'Rua José Bernardo Pinto, 333 - Vila Guilherme', 'São Paulo', 'SP', 'Brazil', -23.511111, -46.612778, 4100),
        ('a0000000-0000-4000-8000-000000000022', 'Vila Germânica', 'Rua Alberto Stein, 199 - Velha', 'Blumenau', 'SC', 'Brazil', -26.915833, -49.084167, 40703),
        ('a0000000-0000-4000-8000-000000000023', 'The Colosseum at Caesars Palace', '3570 S Las Vegas Blvd', 'Las Vegas', 'NV', 'USA', 36.117778, -115.175000, 4100),
        ('a0000000-0000-4000-8000-000000000024', 'Madison Square Garden', '4 Pennsylvania Plaza', 'New York', 'NY', 'USA', 40.750556, -73.993611, 22000),
        ('a0000000-0000-4000-8000-000000000025', 'The O2 Arena', 'Peninsula Square, SE10 0DX', 'London', 'England', 'United Kingdom', 51.502778, 0.003333, 20000),
        ('a0000000-0000-4000-8000-000000000026', 'Estádio Nacional de Brasília', 'SRPN - Asa Norte', 'Brasília', 'DF', 'Brazil', -15.783611, -47.899167, 69910),
        ('a0000000-0000-4000-8000-000000000027', 'Arena Fonte Nova', 'Ladeira da Fonte das Pedras - Nazaré', 'Salvador', 'BA', 'Brazil', -12.978611, -38.504167, 47902),
        ('a0000000-0000-4000-8000-000000000028', 'Estádio Beira-Rio', 'Av. Padre Cacique, 891 - Praia de Belas', 'Porto Alegre', 'RS', 'Brazil', -30.065556, -51.236111, 50848),
        ('a0000000-0000-4000-8000-000000000029', 'Estádio Mineirão', 'Av. Antônio Abrahão Caram, 1001 - São José', 'Belo Horizonte', 'MG', 'Brazil', -19.865833, -43.970833, 66658)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "CatalogVenue"
      WHERE "id"::text LIKE 'a0000000-0000-4000-8000-0000000000__'
    `);
  }
}

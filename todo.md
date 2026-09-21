- [x] Lean Inception
- [ ] Event Storming
- [ ] Criar Bounded Contexts
- [ ] Estrutura da Arquitetura
- [ ] ADR Database

1. Entender o macro de DDD
1. DDD Tático
1. DDD Estratégico
1. Chaos Engineering (Chaos Monkey)
1. Load Testing (k6)
1. Integration Tests

# Implementações

## Página de Compra de Ticket

- [ ] Catalog Module

  - [x] Criar Venue Entity (FK)
  - [x] Criar Artist Entity
  - [x] Criar Event Artist Entity
  - [ ] Implementar Near You com base em (estilo musical, latitude e longitude)

  - [ ] Criar SeatMap Entity (OneToMany with Venue)
  - [ ] Criar TicketType Entity
  - [ ] Add slug on event

- [ ] Ticketing Module

  - [ ] Create SeatHold Entity

- [ ] Implementar cursor-based ao invés de skip-offset
- [ ] Buscar eventos de acordo com a localidade
- [ ] Buscar Testimonials do GraphQL
- [ ] Painel de Admin

  - [ ] Cadastro de Eventos
  - [ ] Cadastro de Testimonials (deve ficar no admin?)

- [ ] Ver vídeo do Akita sobre como escalar uma plataforma de bilheteria

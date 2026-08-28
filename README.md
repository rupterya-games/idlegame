# Fiordevalle Idle RPG

Jogo idle 2D em pixel art com as regioes Fiordevalle e Ryukuzam, personagens
evolutiveis, monstros, combate automatico e persistencia preparada para Supabase.

## Desenvolvimento

```bash
pnpm install
pnpm dev
```

Abra `http://localhost:3000/idle`. A rota `/` redireciona para o jogo.

## Validacao

```bash
pnpm lint
pnpm build
```

## Estrutura

- `app/idle`: interface, motor, progressao, colisao e documentacao.
- `public/idle`: sprites e atlas do jogo.
- `scripts`: ferramentas de extracao de assets do idle.
- `supabase`: migracoes do banco de dados.

Antes de adicionar personagens ou monstros, siga
`app/idle/game/SPRITE_STANDARD.md` e
`app/idle/game/ASSET_CREATION_STANDARD.md`.

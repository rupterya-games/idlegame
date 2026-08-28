# Leitura da referencia IdleTibia

O projeto `idletibia` e somente uma referencia de interface e mecanicas. Ele nao
e fonte de dados do jogo e nunca deve substituir Fiordevalle, Ryukuzam, seus
monstros, atributos, probabilidades ou recompensas.

## O que foi adotado

- analisador da sessao com regiao, estado, abates e ouro;
- lista dos monstros vivos, vida atual e selecao manual de alvo;
- registro compacto de golpes e derrotas;
- historico separado do ouro que o combate ja concedeu;
- distribuicao de interface inspirada em clientes MMO, mantendo o mapa como
  area principal;
- `image-rendering: pixelated` e uma unidade visual base de 32 px.

## O que foi deliberadamente rejeitado

- monstros, mapas, loot e formulas da referencia;
- mapa fixo em grade `15 x 9`;
- caminho limitado a quatro vizinhos, que alterna eixos em diagonais;
- intervalos independentes para cada parte do combate;
- sombra eliptica ou `drop-shadow` embutido nas entidades;
- animacao que desloca o corpo verticalmente;
- ordem de linhas sul/leste/norte/oeste da referencia;
- sprites e imagens copiados do projeto externo.

## Contrato de preservacao

Uma melhoria de layout pode observar o estado do jogo, mas nao pode criar outra
fonte de verdade. O painel le diretamente os monstros de `monsters.ts`, a vida
mantida pelo motor e o ouro concedido pelo fluxo de combate existente.

Antes de integrar uma nova ideia da referencia, confirme:

1. Nenhum valor de monstro ou saque existente foi alterado.
2. O caminho continua diagonal, normalizado e sem corte de quinas.
3. As linhas das folhas continuam baixo, cima, esquerda e direita.
4. O ponto dos pes e a celula fixa continuam intactos.
5. A interface funciona sem desenhar sombra ou base sob o ator.
6. A arte nova segue 32 x 32, 64 x 64 ou multiplos inteiros de 32.

Esta leitura complementa `SPRITE_STANDARD.md` e
`ASSET_CREATION_STANDARD.md`; em caso de conflito, os dois contratos do nosso
jogo prevalecem sobre a referencia externa.

# Contrato de sprites, movimento e integracao

Este e o contrato obrigatorio do idle 2D. Toda classe, criatura ou habilidade
nova deve passar por estas regras antes de entrar no mapa. O guia de geracao de
arte e mapas continua em `ASSET_CREATION_STANDARD.md`.

## 1. Folha direcional imutavel

Toda folha direcional possui `4 colunas x 4 linhas`, totalizando 16 celulas:

| Linha | Direcao visual | Quadros |
| --- | --- | --- |
| 1 | baixo / frente | 4 |
| 2 | cima / costas | 4 |
| 3 | esquerda | 4 |
| 4 | direita | 4 |

As regras abaixo nao podem variar entre personagens:

- Uma criatura completa por celula.
- Fundo RGBA realmente transparente.
- Nenhum checkerboard, piso, circulo, sombra ou brilho de recorte embutido.
- Pes na mesma linha de base nos quatro quadros de uma direcao.
- Mesmo centro corporal entre `idle`, `walk`, `attack` e habilidades.
- Cabeca, pes, capa, cabelo, chifres, asas e arma dentro da propria celula.
- Margem transparente em todos os lados.
- Contorno escuro de pixel art permitido; halo branco ou cinza proibido.
- Efeitos grandes e projeteis ficam no canvas, nao na folha do corpo.

O PNG pode ter qualquer resolucao, inclusive dimensoes que nao dividem por quatro
em numero inteiro. O motor calcula cada borda por `round(indice * tamanho / 4)`;
nunca use apenas `floor(tamanho / 4)` para iniciar todas as celulas.

## 2. O que o preparador pode e nao pode fazer

`prepareSpriteSheet`, em `ui/idle-game.tsx`, e o unico pipeline autorizado:

1. Recorta as 16 celulas por limites exatos e independentes.
2. Preserva integralmente o alpha, o centro corporal e a linha dos pes.
3. Cria 16 canvases transparentes com dimensao fixa.

Fundo e franja sao corrigidos antes da integracao por
`scripts/normalize_pixel_atlas.py`. O navegador nao tenta reconstruir arte ruim.

O preparador **nao pode**:

- recortar cada pose pelo corpo detectado;
- recentralizar componentes conectados;
- mover cabeca, pe, arma ou efeito dentro da celula;
- alinhar os quadros por um componente encontrado em tempo de execucao;
- inventar sombra de contato;
- usar o quadro anterior ou vizinho para completar uma pose.

Essas operacoes causaram as regressoes de cabeca/chapeu no chao, pe separado,
personagem flutuando e troca de escala. A origem da arte e responsavel por centro
e linha dos pes; o motor preserva a celula.

## 3. Grade 32/64, ancoragem e desenho

A unidade oficial de pixel art e `32 px`. Novas artes devem ser produzidas em
uma destas celulas logicas antes de qualquer ampliacao nearest-neighbor:

- `32 x 32`: icones, itens, projeteis e criaturas realmente pequenas;
- `64 x 64`: personagens e monstros humanoides comuns;
- multiplos de 32: criaturas grandes que nao cabem com margem em 64 px.

A ampliacao para exibicao sempre usa escala inteira (`2x`, `3x` ou `4x`) e
`image-rendering: pixelated`. Nunca reduza uma pintura grande e suavizada para
simular pixel art. Os assets legados atuais continuam com seus tamanhos de
exibicao aprovados ate serem substituidos por folhas 32/64 validadas; o motor nao
os redimensiona automaticamente.

Todos os personagens terrestres usam o ponto `actor.x, actor.y` como contato dos
pes com o mundo. `drawSpriteFrame` desenha a celula inteira acima desse ponto.

- Morcegos comuns: `32 px` no canvas.
- Cowboy, arqueiro, vampiros, Golden Morcego e Onis comuns: `64 px`.
- Oni brutamontes: `96 px`.
- Behemuts: `128 px`.
- Barras usam uma altura propria da categoria, sem alterar a sprite.
- Ordenacao de profundidade usa `actor.y`.
- Nao desenhar elipse sob personagens ou monstros.
- Criaturas voadoras podem usar `groundY` proprio, documentado por especie.

Herois e inimigos humanoides de `64 px` devem ocupar a mesma altura util dentro
da celula, com tolerancia maxima de dois pixels. Caminhada e ataque usam o mesmo
corpo, centro, escala e linha dos pes; somente a pose e o equipamento mudam.

Se o personagem parece flutuar, corrija a linha dos pes na folha. Nao compense
movendo o quadro durante a animacao.

## 4. Movimento fisico e direcao visual

O deslocamento e continuo, inclusive em trajetorias diagonais, mas a arte possui
somente quatro direcoes visuais.

- `normalized` controla o vetor fisico e impede ganho de velocidade diagonal.
- `directionFromVector` escolhe frente, costas, esquerda ou direita.
- A troca de eixo possui histerese: pequenas correcoes do caminho nao trocam a
  animacao atual.
- `findWorldPath` usa oito vizinhos e bloqueia corte diagonal de quinas.
- O monstro olha para o alvo apenas ao iniciar um ataque ou habilidade.
- Durante perseguicao, a direcao vem do caminho; nunca recalcular a mira a cada
  quadro antes de mover.
- Separacao fisica nao deve alterar a direcao visual.
- Nao usar movimento cardinal alternado para simular diagonal. Isso cria o
  zigue-zague esquerda/direita observado nos vampiros.

Durante ataque, a direcao escolhida no inicio fica travada ate `attackPulse` ou
`abilityPulse` terminar. O dano acontece no quadro de impacto, sem trocar para
`walk` no meio do golpe.

## 5. Registro de uma nova criatura

Cada integracao deve passar pelos mesmos pontos, sem criar um pipeline paralelo:

| Responsabilidade | Arquivo |
| --- | --- |
| especie, regiao e campos | `game/types.ts` |
| atributos, raridade e nascimento | `game/monsters.ts` |
| separacao, movimento e ataque | `game/engine.ts` |
| caminho e colisao do mapa | `game/world.ts` |
| imagens, preparacao e desenho | `ui/idle-game.tsx` |
| contrato visual e prompt | `game/ASSET_CREATION_STANDARD.md` |

No renderizador:

1. Adicione a chave em `Images`.
2. Adicione a chave em `directionalSpriteNames`.
3. Registre o caminho em `loadImages`.
4. Inclua a folha em `regionSpriteNames`.
5. Selecione `walk` ou `attack` em `drawMonster`/`drawPlayer`.
6. Defina tamanho, barra e separacao pela categoria.
7. Incremente `SPRITE_ASSET_VERSION` se o processamento ou um arquivo publicado
   sob o mesmo nome mudar.

Arquivos novos recebem uma versao nova no nome. Nao sobrescreva `v1` com uma
arte diferente e confie apenas no cache do navegador.

## 6. Diagnostico rapido

| Sintoma | Causa provavel | Correcao correta |
| --- | --- | --- |
| halo branco/cinza | fundo opaco ou antialias do fundo | corrigir alpha; limpeza externa de compatibilidade |
| bola sob os pes | sombra embutida ou elipse do motor | remover a sombra, nunca reposicionar o corpo |
| cabeca/pe no chao | recorte/recentralizacao por componentes | preservar celula fixa e limites exatos |
| chapeu/cabeca cortada | parte ultrapassa a celula | corrigir folha e margem transparente |
| frente alterna com lados | direcao recalculada por microcorrecoes | histerese e direcao derivada do caminho |
| monstro zigue-zagueia | A* cardinal alternado | caminho diagonal continuo sem cortar quinas |
| ataque mostra `walk` | estado de ataque nao travado | manter folha/direcao ate o pulso terminar |
| volta apenas na Vercel | asset antigo em cache | nova versao de arquivo/cache e teste de producao |

## 7. Validacao obrigatoria antes do deploy

- [ ] Inspecionar os 16 quadros da folha, nao apenas o primeiro.
- [ ] Confirmar alpha real nos quatro cantos e entre pernas/armas.
- [ ] Confirmar ausencia de sombra, piso, checkerboard e halo.
- [ ] Caminhar para frente por pelo menos cinco segundos sem mostrar lados.
- [ ] Caminhar para tras por pelo menos cinco segundos sem mostrar lados.
- [ ] Testar diagonal longa: deslocamento fluido e direcao visual estavel.
- [ ] Testar esquerda e direita sem corte de cabeca, pe ou arma.
- [ ] Observar um ciclo completo de ataque nas quatro direcoes.
- [ ] Observar perseguicao com tres monstros e separacao fisica.
- [ ] Passar perto de arvores, estruturas e quinas sem atravessar ou travar.
- [ ] Conferir local em desktop e mobile.
- [ ] Executar lint e build.
- [ ] Publicar com versao de cache nova.
- [ ] Repetir a inspecao na URL de producao.

Uma nova criatura so esta pronta quando todos os itens passam. Aprovar apenas a
imagem estatica nao e suficiente.

# Padrao de criacao de sprites e mapas

Este documento define o pipeline oficial de arte e integracao do idle 2D. O
objetivo e permitir que qualquer personagem, monstro, habilidade ou mapa novo
entre no jogo sem mudar de escala, cortar cabeca/arma, flutuar sobre o piso ou
quebrar a troca de animacao.

## 1. Estrutura de arquivos

Todos os arquivos finais do idle ficam em:

```text
public/idle/assets/
```

Use nomes em minusculas, palavras separadas por hifen e versao no final:

```text
<criatura>-walk-4dir-v1.png
<criatura>-attack-4dir-v1.png
<personagem>-<habilidade>-4dir-v1.png
<mapa>-terrain-v1.png
<mapa>-architecture-v1.png
```

Nunca sobrescreva uma versao publicada. Crie `v2`, atualize o caminho no codigo
e mantenha a versao anterior ate a nova passar pela validacao.

## 2. Folha direcional obrigatoria

Personagens e monstros usam uma folha com 4 colunas e 4 linhas. Sao 16 quadros.

| Linha | Direcao | Colunas |
| --- | --- | --- |
| 1 | baixo / frente | quadros 1 a 4 |
| 2 | cima / costas | quadros 1 a 4 |
| 3 | esquerda | quadros 1 a 4 |
| 4 | direita | quadros 1 a 4 |

Regras obrigatorias:

- Uma unica criatura completa por celula.
- Corpo centralizado horizontalmente.
- Pixel mais baixo do pe na mesma linha em todos os quadros da mesma direcao.
- Cabeca, chifres, cabelo, capa, asas, armas e efeitos dentro da celula.
- Margem transparente real entre a criatura e os quatro lados da celula.
- Fundo RGBA transparente, sem piso e sem sombra embutida.
- Pixel art nitida, sem antialias pictorico e sem halo claro.
- A ordem das linhas nunca pode mudar entre caminhada, ataque e habilidade.

O tamanho total do PNG pode variar. O motor calcula cada limite com
`round(indice * tamanho / 4)`, inclusive quando a dimensao nao e divisivel por
quatro. O importante e que a composicao respeite uma grade visual `4 x 4`.

## 3. Caminhada, ataque e habilidade

### Caminhada

Os quatro quadros formam um ciclo continuo:

1. Pose neutra ou primeiro passo.
2. Pe ou asa avancando.
3. Passo oposto ou abertura maxima da asa.
4. Recuperacao que retorna ao primeiro quadro.

O tronco nao deve saltar de altura entre quadros. Em criaturas voadoras, use um
centro de voo fixo e mova principalmente as asas.

### Ataque basico

Use a mesma criatura, escala e equipamento da folha de caminhada:

1. Preparacao.
2. Carregamento do golpe.
3. Impacto.
4. Recuperacao.

O impacto deve estar no terceiro quadro. O motor aplica dano no meio do pulso de
ataque, portanto o efeito visual e o dano permanecem sincronizados.

### Habilidade

Uma habilidade com pose propria recebe outra folha `4dir` e entra em
`DirectionalSpriteName`. Efeitos devem ficar compactos dentro da celula. Efeitos
de area grandes, como Nova Carmesim ou impacto do Behemut, devem ser desenhados
separadamente no canvas para nao deformar o recorte do corpo.

## 4. Escala visual por categoria

O padrao de producao usa uma grade logica de `32 px`: icones e criaturas
pequenas em `32 x 32`, humanoides em `64 x 64` e chefes em multiplos de 32. A
exibicao pode ampliar a arte somente em escala inteira e com nearest-neighbor.

O PNG fonte pode ter qualquer resolucao, mas o tamanho final no canvas deve
seguir uma categoria consistente:

| Categoria | Tamanho aproximado no canvas |
| --- | ---: |
| Cowboy, arqueiro e vampiros | 64 px |
| Morcego comum | 32 px |
| Golden Morcego | 64 px |
| Oni comum e Oni lutador | 64 px |
| Oni brutamontes | 96 px |
| Oni Behemut e Behemut Gold | 128 px |

Ao mudar o tamanho visual, revise tambem:

- altura das barras de vida e mana;
- altura do marcador de raridade;
- linha de base dos pes ou centro de voo;
- separacao fisica em `monsterSeparation`;
- alcance corpo a corpo em `monsterMeleeRange`.

## 5. Prompt base para personagem ou monstro

Use este esqueleto ao gerar uma caminhada:

```text
Create a production-ready pixel-art 4-direction WALK sprite sheet for
[NOME E PAPEL]. [DESCRICAO COMPLETA DE CORPO, ROUPA, ARMA, CORES E SILHUETA].
STRICT 4 columns x 4 rows, one complete isolated full-body character per cell.
Row 1 faces down/front, row 2 up/back, row 3 left, row 4 right. Four walk frames
per direction. Fixed foot baseline and body center. Keep hair, horns, wings,
weapons, clothes and feet completely inside each cell with generous gutters.
True transparent RGBA background, no checkerboard baked in, no floor, no cast
shadow, no text, no UI. Crisp nearest-neighbor pixel art, no antialias halo.
```

Para ataque, sempre use a caminhada aprovada como referencia e troque `WALK`
por `ATTACK`. Descreva os quatro quadros e repita a exigencia de escala, direcao,
baseline, margens e transparencia.

## 6. Hierarquias atuais

### Fiordevalle: vampiros

| Classe | Identidade | Codigo |
| --- | --- | --- |
| Normal | vampiro base | `vampire` + `normal` |
| Raro | cabelo prata, ataque gelado | `vampire` + `rare` |
| Lendario | armadura carmesim, Nova Carmesim | `vampire` + `legendary` |

### Fiordevalle: morcegos

| Classe | Identidade | Codigo |
| --- | --- | --- |
| Morcego | preto, asas vinho, muito rapido | `bat` |
| Golden Morcego | dourado, maior, miniboss | `golden-bat` |

O Golden Morcego tem 2% de chance nos reaparecimentos, 10% na primeira vaga da
ilha por sessao e recompensa garantida de 100 de ouro.

### Ryukuzam: hierarquia Oni

| Classe | Identidade | Codigo | Ouro |
| --- | --- | --- | ---: |
| Oni comum | azul, palha, kanabo de madeira | `oni-common` | 14 |
| Oni lutador | vermelho, armadura leve, katana | `oni-fighter` | 30 |
| Oni brutamontes | verde, armadura pesada, tetsubo | `oni-brute` | 55 |
| Oni Behemut | pele de pedra, quatro chifres, punhos | `oni-behemut` | 120 |
| Oni Behemut Gold | obsidiana e ouro, chefe de teste | `oni-behemut-gold` | 300 |

As especies, atributos, dano, velocidade, mana e recompensa ficam em
`game/monsters.ts`. Nao coloque numeros de combate dentro do desenho ou do
renderizador.

## 7. Habilidades do cowboy

### Disparo de Prata

- Dano base: 14.
- Usa `cowboy-attack-4dir-v9.png`, derivado e escalado pelo mesmo corpo da caminhada `v7`.
- O projetil e desenhado pelo motor, nao dentro de todos os quadros da folha.

### Tambor Marcado

- Passiva que conta todos os disparos confirmados.
- Depois de 6 tiros, `critArmed` fica ativo.
- A primeira bala seguinte causa critico garantido de 200%.
- Depois do critico, o tambor volta para zero.

### Duplo Tambor

- Reutiliza a folha de ataque canonica do cowboy; os 12 projeteis ficam no canvas.
- Custa 35 de mana.
- Dispara 12 balas alternando as duas pistolas.
- Cada bala causa 70% do dano base, arredondado para 10.
- Recarga atual: 14 segundos.
- As balas tambem participam da contagem do Tambor Marcado.

Novas habilidades devem separar tres responsabilidades:

1. Folha de pose/animação em `public/idle/assets`.
2. Estado, custo, recarga e dano no loop do jogo.
3. Efeito grande, projetil e texto flutuante no canvas.

## 8. Atlas de terreno

Cada mapa usa um atlas de 4 colunas por 4 linhas, com 16 tiles quadrados:

```text
<mapa>-terrain-v1.png
```

Regras:

- Cada tile preenche toda a celula.
- Bordas devem repetir sem formar linhas evidentes.
- Nao inclua casas, personagens ou UI.
- Crie variacoes de solo, estrada, agua, vegetacao e area de combate.
- Evite que todos os tiles usem uma unica cor dominante.
- O piso precisa continuar legivel atras de personagens e barras.
- Use pixel art limpa de 16/32 bits, formas simplificadas e contorno de pixel.
- Nao use pintura realista, textura fotografica ou acabamento dark fantasy
  detalhado que destoe dos personagens de `64 x 64`.
- Solo e caminhos devem ter contraste moderado; os atores sao o foco visual.

Fiordevalle usa pedra gelada, neve, rosas, cemiterio e arquitetura gotica.
Ryukuzam usa pedra musgosa, terra escura, bambu, folhas de bordo, arrozais,
madeira, caminhos de torii e sangue de campo de batalha.

O mapa publicado tambem pode usar um backplate continuo `4:3` normalizado para
`1200 x 900`, desenhado no mundo em `2400 x 1800`. O atlas continua sendo a
fonte para expansoes e transicoes. Backplates nao podem conter personagens, UI
ou props com colisao; esses elementos permanecem em camadas separadas.

### Mapa visual e mapa fisico sao um contrato unico

Toda mudanca na agua, ilha, ponte, estrada ou margem do backplate exige a mesma
mudanca em `game/world.ts` e, quando aplicavel, em `game/map-layout.ts`.

- `canStand`, `moveWithCollision` e `findWorldPath` sempre recebem a regiao.
- Fiordevalle e Ryukuzam nunca compartilham mascara de agua por acidente.
- A ponte desenhada deve cobrir integralmente a faixa caminhavel.
- Props altos ficam em camadas separadas e recebem colisao na base, nao no topo.
- Arvores e pedras nao podem nascer sobre a estrada principal nem sobre zonas
  de surgimento.
- O teste final deve atravessar margens, ponte e arredores de estruturas nos
  dois mapas.

## 9. Atlas de arquitetura

Arquitetura e props isolados usam atlas `4 x 4` sempre que possivel:

```text
<mapa>-architecture-v1.png
```

Cada objeto precisa:

- ficar completamente dentro da celula;
- compartilhar a mesma camera top-down tres-quartos;
- ter fundo transparente;
- possuir base visual clara para ordenar pelo eixo Y;
- evitar sombras que atravessem outra celula;
- ter tamanho compativel com os demais objetos do atlas.

Objetos atuais de Ryukuzam incluem torii, santuario, pagode, dojo, casa, ponte,
bambu, bordo vermelho, lanternas, altar de raposa, portao, estandarte Oni,
termas, armazem, ruina e sino Oni.

## 10. Como registrar uma folha no codigo

No arquivo `ui/idle-game.tsx`:

1. Adicione uma chave ao tipo `Images`.
2. Se for direcional, a chave entra automaticamente no tipo
   `DirectionalSpriteName` quando nao for um atlas de ambiente.
3. Adicione a chave a `directionalSpriteNames`.
4. Adicione o caminho em `loadImages`.
5. Adicione a chave correta em `drawMonster` ou `drawCowboy`.
6. Defina o tamanho final e altura das barras. Nao adicione sombra ao ator.
7. Inclua a chave em `regionSpriteNames` para carregar apenas no mapa correto.

Exemplo:

```ts
oniCommonWalk: "/idle/assets/oni-common-walk-4dir-v1.png",
oniCommonAttack: "/idle/assets/oni-common-attack-4dir-v1.png",
```

O preparador de folhas recorta independentemente os 16 quadros por limites
exatos e cria canvases transparentes de tamanho fixo. Alpha, halo e chroma key
sao resolvidos antes pelo normalizador de assets.

O preparador nunca recentraliza corpo, cabeca, pes, arma ou efeito. Centro e
linha de base pertencem a arte fonte. Consulte `SPRITE_STANDARD.md` antes de
alterar o recorte ou o movimento.

O processamento e feito em fila e por regiao. Nao volte a preparar todas as
folhas na abertura da pagina, pois isso bloqueia a interface em computadores e
celulares mais lentos.

## 11. Como registrar uma criatura

No arquivo `game/types.ts`:

- adicione o identificador em `MonsterSpecies`;
- mantenha o campo `region` correto.

No arquivo `game/monsters.ts`:

- adicione o perfil com PV, mana, dano, habilidade, velocidade, ouro, roubo de
  vida e alcance de agressao;
- crie ou reutilize uma funcao `apply...Species`;
- defina a regra de nascimento e reaparecimento;
- use `findMonsterSpawn` ou uma funcao de zona especifica;
- nunca crie a criatura dentro de estrutura ou de outra criatura.

No arquivo `game/engine.ts`:

- ajuste `monsterSeparation` conforme o volume visual;
- ajuste alcance de ataque se a criatura for grande;
- habilidades de area usam `abilityDamage`, `abilityCooldown` e `abilityPulse`.

No renderizador:

- selecione caminhada ou ataque pela especie;
- defina `size`, `groundY`, barra e marcador;
- filtre por `monster.region === regionRef.current`.

## 12. Como criar uma nova regiao

1. Adicione o nome a `WorldRegion`.
2. Gere atlas de terreno e arquitetura.
3. Registre ambos em `Images` e `loadImages`.
4. Adicione opcao no seletor de mapas.
5. Defina criaturas com o novo valor de `region`.
6. Filtre render, combate, separacao e busca de alvo pela regiao ativa.
7. Defina obstaculos e landmarks que coincidam com a arte desenhada.
8. Reinicie jogador, caminho e camera ao trocar de regiao.
9. Teste desktop e celular.

Fiordevalle e Ryukuzam nunca devem compartilhar uma criatura ativa invisivel.
Uma regiao pausada pode manter seus dados, mas nao deve mover, atacar ou colidir.

## 13. Checklist antes de publicar

- [ ] A folha tem exatamente 4 colunas e 4 linhas.
- [ ] As linhas seguem baixo, cima, esquerda e direita.
- [ ] Nenhum quadro corta cabeca, chifre, asa, arma ou efeito.
- [ ] Os pes ou centro de voo mantem a mesma altura.
- [ ] O fundo esta transparente ou pode ser removido pela borda.
- [ ] A criatura nao possui sombra embutida.
- [ ] Caminhada e ataque usam a mesma escala e o mesmo personagem.
- [ ] A folha foi registrada em `Images`, `loadImages` e `regionSpriteNames`.
- [ ] A especie possui perfil centralizado em `monsters.ts`.
- [ ] Separacao, alcance e barra acompanham o tamanho visual.
- [ ] O caminho diagonal nao alterna sprites laterais durante avanco vertical.
- [ ] O nascimento evita mapa bloqueado, estruturas e outras criaturas.
- [ ] Ouro e chance rara foram testados.
- [ ] Trocar de mapa pausa monstros da outra regiao.
- [ ] O build termina sem erro de TypeScript.
- [ ] A pagina abre sem aviso de runtime.
- [ ] A cena foi conferida em desktop e mobile antes do deploy.

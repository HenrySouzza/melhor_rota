# 🚑 Simulador de Rota de Emergência: Busca Gulosa vs A*

Uma aplicação web interativa construída puramente com **HTML5, CSS3 e JavaScript (Vanilla JS)** — sem nenhum framework ou biblioteca externa — para visualizar e comparar na prática o comportamento dos algoritmos de busca informada **Busca Gulosa (Greedy Best-First Search)** e **A\* (A-Estrela)**.

---

## 🎯 Contexto da Simulação

Uma **ambulância** (ponto de partida verde `A`) precisa chegar o mais rápido possível a um **hospital** (destino vermelho `H`) atravessando uma **cidade realista** em uma malha urbana **40x40**:

- **Malha viária orgânica:** quarteirões de tamanhos e formatos irregulares (como um bairro que cresceu sem plano diretor), separados por **avenidas** de 2 pistas (asfalto mais escuro, faixa tracejada amarela, **custo 1**) e **ruas** secundárias estreitas (**custo 2**). O mapa inclui becos, ruas sem saída, superquarteirões e eixos que não se alinham de um lado a outro.
- **Quarteirões variados:** prédios com tonalidades diferentes por quadra, praças, parques (com lagoas) e estacionamentos — os obstáculos continuam intransponíveis, mas a cidade deixa de parecer uma malha uniforme.
- **Interdições:** trechos de rua aleatoriamente fechados por obras/acidentes (células listradas de laranja) — criam becos sem saída e "armadilhas" para a Busca Gulosa.
- **Congestionamentos:** manchas contíguas de trânsito pesado ao longo das vias (**custo 3 a 5**). O A\* desvia quando compensa; a Gulosa ignora o custo e atravessa o trânsito.
- **Rota estilo GPS:** o caminho final é desenhado como uma polilinha grossa e arredondada (como em apps de navegação) e uma **ambulância animada 🚑** "dirige" por ela com sirene pulsante, **desacelerando nas células congestionadas**.
- **Movimentação permitida:** 4 direções (Cima, Baixo, Esquerda e Direita).
- **Custo das células:** entrar em uma célula soma o seu custo ao caminho, e $g(n)$ é a soma desses custos.
- **Heurística utilizada:** Distância de Manhattan:
  $$h(n) = |x_1 - x_2| + |y_1 - y_2|$$

### Diferença entre os Algoritmos

| Algoritmo | Função de Avaliação | Comportamento | Garante o Menor Caminho? |
| :--- | :--- | :--- | :--- |
| **Busca Gulosa** | $f(n) = h(n)$ | Olha apenas para a distância estimada até o hospital. Tende a explorar menos nós em linha reta, mas pode cair em "armadilhas" e dar voltas maiores. | ❌ **Não** |
| **Algoritmo A\*** | $f(n) = g(n) + h(n)$ | Soma o custo já percorrido desde a origem $g(n)$ com a estimativa restante $h(n)$. Equilibra exploração e eficiência. | ✅ **Sim (Ótimo)** |

---

## 💻 Como Rodar o Projeto em Qualquer PC (Sem Instalar Nada!)

Este projeto foi desenvolvido com tecnologias nativas da web (**HTML, CSS e JS puros**). Isso significa que **você NÃO precisa instalar Node.js, Python, pacotes npm ou servidores locais**.

Qualquer computador (Windows, Linux ou macOS) com um navegador de internet (Google Chrome, Edge, Firefox, Brave, Safari) roda a aplicação instantaneamente.

### Passo a Passo:

1. **Baixe os arquivos do projeto:**
   - Caso esteja no GitHub, clique no botão verde **`<> Code`** e selecione **`Download ZIP`**.
   - Se você recebeu os arquivos em uma pasta ou `.zip`, extraia-os para uma pasta de sua preferência (por exemplo, na sua *Área de Trabalho* ou em *Documentos*).

2. **Mantenha os 3 arquivos juntos na mesma pasta:**
   Certifique-se de que os arquivos abaixo estejam lado a lado dentro do mesmo diretório:
   ```text
   📁 ia_pratica_seminario/
   ├── 📄 index.html
   ├── 🎨 style.css
   ├── ⚙️ script.js
   └── 📖 README.md
   ```

3. **Abra o arquivo `index.html` no navegador:**
   - Dê **dois cliques** diretamente sobre o arquivo **`index.html`**.
   - *Alternativa:* Clique com o botão direito no arquivo `index.html` ➔ **Abrir com** ➔ escolha seu navegador favorito (Chrome, Firefox, Edge, etc.), ou simplesmente arraste o arquivo `index.html` para dentro de uma janela aberta do navegador.

4. **Pronto!** O simulador já estará funcionando na sua tela.

---

## 🎮 Como Usar a Interface

1. **Gerar Cidade (Mapa Realista):** Cria instantaneamente uma nova cidade com avenidas, ruas, quarteirões irregulares (prédios, praças, parques e estacionamentos), interdições de via e manchas de congestionamento, garantindo que exista pelo menos uma rota possível entre a ambulância e o hospital.
2. **Executar Busca Gulosa:** Anima a exploração em **Azul Claro** e destaca a rota final encontrada em **Azul Escuro**.
3. **Executar A\*:** Anima a exploração em **Amarelo Claro** e destaca o caminho ótimo em **Amarelo Escuro** — ao final, a ambulância 🚑 dirige pela rota em estilo GPS, desacelerando no trânsito.
4. **Comparar Ambos:** Executa primeiro a Busca Gulosa e, logo em seguida, sobrepõe o A* no mesmo mapa, preenchendo a tabela comparativa de métricas no painel lateral.
5. **Limpar Caminhos:** Remove apenas as cores de exploração e caminhos, mantendo a cidade atual intacta para você testar novamente.
6. **Velocidade da Animação:** Ajuste o controle deslizante (*slider*) em tempo real, desde o modo *Passo a Passo* até *Instantânea / Turbo* (também afeta a velocidade da ambulância).
7. **Editor Interativo de Mapa:** Clique e arraste diretamente sobre a matriz 40x40 para desenhar/apagar obstáculos (simulando novas interdições ou reabrindo vias). Ao usar as ferramentas **Ambulância** / **Hospital**, eles são reposicionados automaticamente para a **rua mais próxima** — como um GPS de verdade.

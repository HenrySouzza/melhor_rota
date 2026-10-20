# 🚑 Simulador de Rota de Emergência: Busca Gulosa vs A*

Uma aplicação web interativa construída puramente com **HTML5, CSS3 e JavaScript (Vanilla JS)** — sem nenhum framework ou biblioteca externa — para visualizar e comparar na prática o comportamento dos algoritmos de busca informada **Busca Gulosa (Greedy Best-First Search)** e **A\* (A-Estrela)**.

---

## 🎯 Contexto da Simulação

Uma **ambulância** (ponto de partida verde `A`) precisa chegar o mais rápido possível a um **hospital** (destino vermelho `H`) atravessando uma malha urbana **40x40** repleta de obstáculos e bloqueios de trânsito.

- **Movimentação permitida:** 4 direções (Cima, Baixo, Esquerda e Direita).
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

1. **Gerar Mapa com Obstáculos Aleatórios:** Cria instantaneamente um novo cenário urbano 40x40 garantindo que exista pelo menos uma rota possível entre a ambulância e o hospital.
2. **Executar Busca Gulosa:** Anima a exploração em **Azul Claro** e destaca a rota final encontrada em **Azul Escuro**.
3. **Executar A\*:** Anima a exploração em **Amarelo Claro** e destaca o caminho ótimo em **Amarelo Escuro**.
4. **Comparar Ambos:** Executa primeiro a Busca Gulosa e, logo em seguida, sobrepõe o A* no mesmo mapa, preenchendo a tabela comparativa de métricas no painel lateral.
5. **Limpar Caminhos:** Remove apenas as cores de exploração e caminhos, mantendo os obstáculos atuais intactos para você testar novamente.
6. **Velocidade da Animação:** Ajuste o controle deslizante (*slider*) em tempo real, desde o modo *Passo a Passo* até *Instantânea / Turbo*.
7. **Editor Interativo de Mapa:** Clique e arraste diretamente sobre a matriz 40x40 para desenhar/apagar muros e barreiras em formato de "U", ou selecione as ferramentas **Ambulância** / **Hospital** para mudar os pontos de partida e chegada!

import { UIManager } from './uiManager.js';
import { Utils } from './utils.js';

export class FlowEditor {
   constructor(containerId, elkInstance, options = {}) {
      this.editable = options.editable !== true; // false를 줘야만 편집기능이 꺼짐
      this.elk = elkInstance || new ELK();
      this.containerId = containerId;
      this.containerEl = document.getElementById(containerId);

      this.instance = jsPlumb.getInstance({
         connector: ['Flowchart', { cornerRadius: 5 }],
         PaintStyle: { stroke: '#999999', strokeWidth: 1 },
         Endpoint: 'Dot',
         EndpointStyle: {
            fill: '#3498db',
            radius: 4,
            strokeWidth: 2,
            stroke: '#ffffff',
         },
         Container: this.containerEl,
      });

      this.selectedNode = null;
      this.selectedConnection = null;

      this.ui = new UIManager(this);
      this.utils = new Utils(this);

      this.bindEvents();
      this.bindUIEvents();
   }

   bindEvents() {
      this.instance.bind('connection', (info, originalEvent) => {
         if (!info.connection.getOverlay('arrowOverlay')) {
            info.connection.addOverlay([
               'Arrow',
               { id: 'arrowOverlay', width: 7, length: 8, location: 1 },
            ]);
         }

         const connSvg = info.connection.getConnector().canvas;
         const pathEls = connSvg.querySelectorAll('path');
         if (pathEls.length >= 1) {
            const mainPath = pathEls[0];
            mainPath.classList.add('main-path');
         }

         this.decorateConnection(info.connection);
      });
   }

   async loadData(data) {
      // 1️⃣ 노드 생성
      data.nodes.forEach((node) => {
         this.createNodeElement(node);
      });

      // 2️⃣ ELK 레이아웃 실행
      this.graph = await this.layoutGraph(data);

      // 3️⃣ 연결선 생성
      const obstacles = this.utils.getObstacles(
         Array.from(this.containerEl.querySelectorAll('.flow-node'))
      );

      this.createEdges(this.graph, data, obstacles);

      // 최종 repaint
      this.instance.repaintEverything();
   }

   createNodeElement(node) {
      const div = document.createElement('div');
      div.id = node.id;
      div.style.position = 'absolute';
      div.style.left = node.x + 'px';
      div.style.top = node.y + 'px';
      div.style.width = node.width + 'px';
      div.style.height = node.height + 'px';
      div.style.color =
         node.color === 'transparent' ? node.color : '#' + node.color;
      div.style.fontSize = node.fontSize + 'px';
      div.style.fontWeight = node.fontWeight;
      div.style.borderRadius = node.borderRadius + 'px';
      div.classList.add('flow-node');
      div.classList.add(node.type);
      if (node.type == 'diamond') {
         const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 100" preserveAspectRatio="none">
  <polygon points="80,0 160,50 80,100 0,50" stroke="#${node.borderColor}" stroke-width="1" fill="#${node.backgroundColor}" />
</svg>`;

         const encoded = encodeURIComponent(svg); // ✅ 여기서만 인코딩 1회
         div.style.backgroundImage = `url("data:image/svg+xml;utf8,${encoded}")`;
      } else if (node.type == 'square') {
         div.style.backgroundColor =
            node.backgroundColor === 'transparent'
               ? node.backgroundColor
               : '#' + node.backgroundColor;
         div.style.borderColor =
            node.borderColor === 'transparent'
               ? node.borderColor
               : '#' + node.borderColor;
      }
      const span = document.createElement('span');
      span.innerHTML = node.label || '';
      div.appendChild(span);

      const resizeDiv = document.createElement('div');
      resizeDiv.classList.add('resize-box');

      // 리사이즈 핸들 대각
      const directions = [
         'top-left',
         'top-right',
         'bottom-left',
         'bottom-right', //
      ];
      // 리사이즈 핸들 직선
      const directions2 = ['top', 'right', 'bottom', 'left'];

      directions.forEach((pos) => {
         const handle = document.createElement('div');
         handle.classList.add('resize-area');
         handle.classList.add('resize-handle', pos);
         resizeDiv.appendChild(handle);
      });
      directions2.forEach((pos) => {
         const handle = document.createElement('div');
         handle.classList.add('resize-line', pos);
         handle.classList.add('resize-area');
         resizeDiv.appendChild(handle);
      });

      div.appendChild(resizeDiv);

      div.addEventListener('click', (e) => {
         e.stopPropagation();
         this.selectNode(div);
      });

      this.containerEl.appendChild(div);

      this.instance.draggable(div, {
         grid: [5, 5],
         stop: () => {
            this.updatePaths();
         },
         filter: '.resize-area',
      });

      this.addEndpoints(node.id);
   }

   addEndpoints(nodeId) {
      const anchors = ['Top', 'Right', 'Bottom', 'Left'];
      anchors.forEach((anchor) => {
         this.instance.addEndpoint(nodeId, {
            anchor: anchor,
            uuid: `${nodeId}-${anchor}`,
            isSource: true,
            isTarget: true,
            maxConnections: -1,
            endpoint: 'Dot',
            paintStyle: {
               fill: '#3498db',
               radius: 4,
               strokeWidth: 2,
               stroke: '#ffffff',
            },
            connector: ['Flowchart', { cornerRadius: 5 }],
         });
      });
   }

   async layoutGraph(data) {
      const elkGraph = {
         id: 'root',
         layoutOptions: {
            'elk.algorithm': 'layered',
            'elk.layered.nodePlacement.strategy': 'SIMPLE',
            'elk.edgeRouting': 'ORTHOGONAL',
         },
         children: data.nodes.map((node) => ({
            id: node.id,
            x: node.x,
            y: node.y,
            width: node.width,
            height: node.height,
         })),
         edges: data.connections.map((conn) => ({
            id: `${conn.source}-${conn.target}`,
            sources: [conn.source],
            targets: [conn.target],
            layoutOptions: {
               'elk.direction': this.utils.getElkDirection(conn.anchors),
               'elk.edgeRouting': 'ORTHOGONAL',
            },
         })),
      };

      const graph = await this.elk.layout(elkGraph);
      return graph;
   }

   createEdges(graph, data, obstacles) {
      graph.edges.forEach((edge) => {
         const src = edge.sources[0];
         const tgt = edge.targets[0];

         const connData = data.connections.find(
            (c) => c.source === src && c.target === tgt
         );

         const borderColor = connData.borderColor
            ? '#' + connData.borderColor
            : '#999999';

         const sourceBox = document.getElementById(src).getBoundingClientRect();
         const targetBox = document.getElementById(tgt).getBoundingClientRect();
         const canvasBox = this.containerEl.getBoundingClientRect();

         const sourceVertex = this.utils.getAnchorPoint(
            {
               left: sourceBox.left - canvasBox.left,
               top: sourceBox.top - canvasBox.top,
               width: sourceBox.width,
               height: sourceBox.height,
            },
            connData?.anchors?.[0] || 'Continuous'
         );

         const targetVertex = this.utils.getAnchorPoint(
            {
               left: targetBox.left - canvasBox.left,
               top: targetBox.top - canvasBox.top,
               width: targetBox.width,
               height: targetBox.height,
            },
            connData?.anchors?.[1] || 'Continuous'
         );

         const approxDistance =
            Math.abs(sourceVertex.x - targetVertex.x) +
            Math.abs(sourceVertex.y - targetVertex.y);

         let DIST_LIMIT, GRID_SPACING;

         if (approxDistance > 800) {
            GRID_SPACING = 50;
            DIST_LIMIT = 1200;
         } else if (approxDistance > 400) {
            GRID_SPACING = 30;
            DIST_LIMIT = 800;
         } else {
            GRID_SPACING = 20;
            DIST_LIMIT = 600;
         }

         const vertices = [
            ...this.utils.extractObstacleVertices(obstacles),
            sourceVertex,
            targetVertex,
         ];

         const edgesVG = this.utils.computeVisibilityEdges(
            vertices,
            obstacles,
            DIST_LIMIT
         );

         const dx = Math.abs(sourceVertex.x - targetVertex.x);
         const dy = Math.abs(sourceVertex.y - targetVertex.y);
         const slope = dy / (dx + 1e-6);

         let intersectsFlag = this.utils.intersectsAnyObstacle(
            sourceVertex,
            targetVertex,
            obstacles
         );

         if (slope > 2.0) {
            intersectsFlag = false;
         }

         const overlays = [
            ['Arrow', { id: 'arrowOverlay', width: 7, length: 8, location: 1 }],
         ];

         if (connData?.label) {
            const fontSize =
               connData.fontSize + 'px "Noto Sans KR", sans-serif';
            console.log(fontSize); //11px
            overlays.push([
               'Label',
               {
                  id: 'labelOverlay',
                  label: connData.label,
                  location: 0.5,
                  cssClass: `label-${connData.labelType}`,
                  labelStyle: {
                     font: fontSize, //여기서 왜 12px이 되는지?
                  },
               },
            ]);
         }

         if (!intersectsFlag) {
            // ⭐ 직선 연결
            const conn = this.instance.connect({
               source: src,
               target: tgt,
               anchors: connData?.anchors || ['Continuous', 'Continuous'],
               connector: ['Flowchart', { cornerRadius: 5 }],
               paintStyle: { stroke: borderColor, strokeWidth: 1 },
               overlays: overlays,
            });

            // ⭐ 후처리
            this.decorateConnection(conn);
         } else {
            // ⭐ Dijkstra path 연결
            const path = this.utils.dijkstra(
               vertices,
               edgesVG,
               sourceVertex,
               targetVertex
            );

            if (path.length >= 3) {
               let prev = src;

               path.slice(1, -1).forEach((wp, idx) => {
                  const waypointId = `waypoint-${src}-${tgt}-${Date.now()}-${idx}`;
                  const waypoint = document.createElement('div');
                  waypoint.id = waypointId;
                  waypoint.style.position = 'absolute';
                  waypoint.style.left = `${wp.x}px`;
                  waypoint.style.top = `${wp.y}px`;
                  waypoint.style.width = '1px';
                  waypoint.style.height = '1px';
                  waypoint.style.zIndex = '1';
                  waypoint.classList.add('waypoint');

                  this.containerEl.appendChild(waypoint);

                  const conn = this.instance.connect({
                     source: prev,
                     target: waypointId,
                     anchors: connData?.anchors || ['Continuous', 'Continuous'],
                     connector: ['Flowchart', { cornerRadius: 0 }],
                     paintStyle: { stroke: '#999999', strokeWidth: 1 },
                     overlays: [], // waypoint 연결은 arrow 없음
                  });

                  // ⭐ 후처리
                  this.decorateConnection(conn);

                  prev = waypointId;
               });

               // 마지막 segment 연결
               const conn = this.instance.connect({
                  source: prev,
                  target: tgt,
                  anchors: connData?.anchors || ['Continuous', 'Continuous'],
                  connector: ['Flowchart', { cornerRadius: 5 }],
                  paintStyle: { stroke: '#999999', strokeWidth: 1 },
                  overlays: overlays,
               });

               // ⭐ 후처리
               this.decorateConnection(conn);
            }
         }
      });
   }

   addBgAndHitPath(connection) {
      const connSvg = connection.getConnector().canvas;
      connSvg.setAttribute('pointer-events', 'none');

      const pathEl = connSvg.querySelector('path');

      if (pathEl && !connSvg.querySelector('path.bg-path')) {
         const d = pathEl.getAttribute('d');
         const transform = pathEl.getAttribute('transform');

         const bgPath = document.createElementNS(
            'http://www.w3.org/2000/svg',
            'path'
         );
         bgPath.setAttribute('d', d);
         bgPath.setAttribute('stroke', 'white');
         bgPath.setAttribute('stroke-width', '5');
         bgPath.setAttribute('fill', 'none');
         bgPath.classList.add('bg-path');
         if (transform) bgPath.setAttribute('transform', transform); // ✅ transform 적용

         const hitPath = document.createElementNS(
            'http://www.w3.org/2000/svg',
            'path'
         );
         hitPath.setAttribute('d', d);
         hitPath.setAttribute('stroke', 'transparent');
         hitPath.setAttribute('stroke-width', '10');
         hitPath.setAttribute('fill', 'none');
         hitPath.classList.add('hit-path');
         hitPath.setAttribute('pointer-events', 'stroke');
         if (transform) hitPath.setAttribute('transform', transform); // ✅ transform 적용

         const self = this;

         hitPath.addEventListener('click', (e) => {
            e.stopPropagation();
            self.selectConnection(connection);
         });

         connSvg.insertBefore(bgPath, pathEl);
         connSvg.insertBefore(hitPath, bgPath);
      }
   }

   decorateConnection(connection) {
      this.addBgAndHitPath(connection);
      // future 확장 가능
   }

   selectNode(nodeEl) {
      if (!this.editable) return;
      if (this.selectedNode) {
         this.selectedNode.classList.remove('selected-node');
      }
      if (this.selectedConnection) {
         const prevSvg = this.selectedConnection.getConnector().canvas;
         prevSvg.classList.remove('selected-connection');
         this.selectedConnection = null;
      }

      this.selectedNode = nodeEl;
      this.selectedNode.classList.add('selected-node');

      this.ui.updateNodePanel(nodeEl);
      this.ui.interactSetting(nodeEl);
   }

   selectConnection(conn) {
      if (this.selectedNode) {
         this.selectedNode.classList.remove('selected-node');
         this.selectedNode = null;
      }

      if (this.selectedConnection) {
         const prevSvg = this.selectedConnection.getConnector().canvas;
         prevSvg.classList.remove('selected-connection');
      }

      this.selectedConnection = conn;
      const svgEl = conn.getConnector().canvas;
      svgEl.classList.add('selected-connection');

      // 📌 UI 패널 업데이트는 UIManager에 위임
      if (this.ui) {
         this.ui.updateConnectionPanel(conn);
      }
   }

   updatePaths() {
      document.querySelectorAll('svg.jtk-connector').forEach((connection) => {
         const mainPath = connection.querySelector('path.main-path');
         const d = mainPath.getAttribute('d');

         const bgPath = connection.querySelector('path.bg-path');
         const hitPath = connection.querySelector('path.hit-path');

         if (bgPath) bgPath.setAttribute('d', d);
         if (hitPath) hitPath.setAttribute('d', d);
      });
   }

   repaint() {
      this.instance.repaintEverything();
      const connections = this.instance.getAllConnections();
      connections.forEach((conn) => this.updatePaths(conn));
   }

   changeStyle(type) {
      this.ui.changeStyle(type);
   }

   exportToJson() {
      this.ui.exportToJson();
   }

   showEndpoint() {
      if (!this.editable) return;
      this.ui.showEndpoint();
   }

   addBaseNode() {
      if (!this.editable) return;
      this.ui.addBaseNode();
   }

   bindUIEvents() {
      this.ui.bindUIEvents();
   }
}

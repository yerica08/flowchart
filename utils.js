export class Utils {
   constructor(flowEditor) {
      this.flowEditor = flowEditor;
   }

   getElkDirection(anchors) {
      if (!anchors) return 'RIGHT';
      const sourceAnchor = anchors[0];
      const targetAnchor = anchors[1];

      if (sourceAnchor === 'Left') return 'LEFT';
      if (sourceAnchor === 'Right') return 'RIGHT';
      if (sourceAnchor === 'Top') return 'UP';
      if (sourceAnchor === 'Bottom') return 'DOWN';

      return 'RIGHT';
   }
   getObstacles(nodes) {
      const canvasBox = this.flowEditor.containerEl.getBoundingClientRect();
      return nodes.map((node) => {
         const box = node.getBoundingClientRect();
         const left = box.left - canvasBox.left;
         const top = box.top - canvasBox.top;

         return {
            left,
            top,
            width: box.width,
            height: box.height,
         };
      });
   }

   extractObstacleVertices(obstacles) {
      const margin = 5;
      const vertices = [];

      obstacles.forEach((box) => {
         const left = box.left;
         const top = box.top;
         const right = box.left + box.width;
         const bottom = box.top + box.height;

         vertices.push({ x: left - margin, y: top - margin });
         vertices.push({ x: right + margin, y: top - margin });
         vertices.push({ x: left - margin, y: bottom + margin });
         vertices.push({ x: right + margin, y: bottom + margin });
      });

      return vertices;
   }
   dijkstra(vertices, edges, start, end) {
      const distances = new Map();
      const previous = new Map();
      const queue = [...vertices];

      vertices.forEach((v) => {
         distances.set(v, Infinity);
      });

      distances.set(start, 0);

      while (queue.length > 0) {
         queue.sort((a, b) => distances.get(a) - distances.get(b));
         const current = queue.shift();

         if (current === end) {
            break;
         }

         edges
            .filter((e) => e.from === current)
            .forEach((e) => {
               const alt = distances.get(current) + this.distance(e.from, e.to);

               if (alt < distances.get(e.to)) {
                  distances.set(e.to, alt);
                  previous.set(e.to, current);
               }
            });
      }

      const path = [];
      let current = end;

      while (current !== undefined) {
         path.unshift(current);
         current = previous.get(current);
      }

      return path;
   }

   distance(a, b) {
      return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
   }

   intersectsAnyObstacle(p1, p2, obstacles) {
      for (const box of obstacles) {
         if (this.lineIntersectsBox(p1, p2, box)) return true;
      }
      return false;
   }
   lineIntersectsBox(p1, p2, box) {
      const tolerance = 2;
      const expandedBox = {
         left: box.left - tolerance,
         top: box.top - tolerance,
         right: box.left + box.width + tolerance,
         bottom: box.top + box.height + tolerance,
      };

      const boxEdges = [
         [
            { x: expandedBox.left, y: expandedBox.top },
            { x: expandedBox.right, y: expandedBox.top },
         ],
         [
            { x: expandedBox.right, y: expandedBox.top },
            { x: expandedBox.right, y: expandedBox.bottom },
         ],
         [
            { x: expandedBox.right, y: expandedBox.bottom },
            { x: expandedBox.left, y: expandedBox.bottom },
         ],
         [
            { x: expandedBox.left, y: expandedBox.bottom },
            { x: expandedBox.left, y: expandedBox.top },
         ],
      ];

      for (const edge of boxEdges) {
         if (this.linesIntersect(p1, p2, edge[0], edge[1])) {
            return true;
         }
      }

      return false;
   }
   linesIntersect(p1, p2, q1, q2) {
      const ccw = (a, b, c) =>
         (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);

      return (
         ccw(p1, q1, q2) !== ccw(p2, q1, q2) &&
         ccw(p1, p2, q1) !== ccw(p1, p2, q2)
      );
   }
   computeVisibilityEdges(vertices, obstacles, DIST_LIMIT) {
      const edges = [];

      vertices.forEach((v1, i) => {
         vertices.forEach((v2, j) => {
            if (i === j) return;

            const dist = Math.abs(v1.x - v2.x) + Math.abs(v1.y - v2.y);
            if (dist > DIST_LIMIT) return;

            if (!this.intersectsAnyObstacle(v1, v2, obstacles)) {
               edges.push({ from: v1, to: v2 });
            }
         });
      });

      return edges;
   }
   getAnchorPoint(box, anchor) {
      const offset = 5;

      switch (anchor) {
         case 'Top':
            return { x: box.left + box.width / 2, y: box.top - offset };
         case 'Bottom':
            return {
               x: box.left + box.width / 2,
               y: box.top + box.height + offset,
            };
         case 'Left':
            return { x: box.left - offset, y: box.top + box.height / 2 };
         case 'Right':
            return {
               x: box.left + box.width + offset,
               y: box.top + box.height / 2,
            };
         default:
            return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
      }
   }
   encodeSvgToDataUrl(svgString) {
      // URL-safe하게 인코딩
      const encoded = svgString
         .replace(/"/g, `'`) // 큰따옴표 → 작은따옴표 (문자열 충돌 방지)
         .replace(/#/g, '%23') // # → %23 (색상 값 보호)
         .replace(/\n/g, '') // 줄바꿈 제거 (최적화)
         .replace(/\s+/g, ' '); // 불필요한 공백 축소

      return `url('data:image/svg+xml;utf8,${encoded}')`;
   }
}

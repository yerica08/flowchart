export class UIManager {
   constructor(flowEditor) {
      this.flowEditor = flowEditor;
      this.nodeBg = null;
      this.nodeBorder = null;
      this.exportData = null;
      this.pickrBg = null;
      this.pickrBorder = null;

      this.baseStyleList = {
         ellipse: {
            width: '150px',
            height: '40px',
            backgroundColor: '#8F9CAA',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: '400',
            borderColor: 'transparent',
            borderRadius: '30px',
         },
         rectangle1: {
            width: '80px',
            height: '40px',
            backgroundColor: '#f4f4f4',
            color: '#222222',
            fontSize: '13px',
            fontWeight: '400',
            borderColor: '#dddddd',
            borderRadius: '3px',
         },
         rectangle2: {
            width: '140px',
            height: '30px',
            backgroundColor: '#ffffff',
            color: '#444444',
            fontSize: '14px',
            fontWeight: '400',
            borderColor: '#dddddf',
            borderRadius: '10px',
         },
         diamond: {
            width: '150px',
            height: '80px',
            backgroundColor: 'transparent',
            color: '#222222',
            fontSize: '14px',
            fontWeight: '500',
            borderColor: 'transparent',
            borderRadius: '0',
         },
      };

      if (this.flowEditor.editable) {
         this.pickrSetting();
      }
   }

   changeStyle(type) {
      const node = this.flowEditor.selectedNode;
      if (!node) return;

      if (
         type === 'ellipse' ||
         type === 'rectangle1' ||
         type === 'rectangle2'
      ) {
         node.classList.remove('diamond');
         node.style.backgroundImage = 'none';
      } else if (type === 'diamond') {
         node.classList.add('diamond');
         node.style.backgroundImage =
            "url('data:image/svg+xml;utf8,%0A%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20160%20100%22%20preserveAspectRatio%3D%22none%22%3E%0A%20%20%3Cpolygon%20points%3D%2280%2C0%20160%2C50%2080%2C100%200%2C50%22%20stroke%3D%22%23a7a7a7%22%20stroke-width%3D%221%22%20fill%3D%22%23ffffff%22%20%2F%3E%0A%3C%2Fsvg%3E')";
      }

      const styleSet = this.baseStyleList[type];

      node.style.width = styleSet.width;
      node.style.height = styleSet.height;
      node.style.backgroundColor = styleSet.backgroundColor;
      node.style.color = styleSet.color;
      node.style.fontSize = styleSet.fontSize;
      node.style.fontWeight = styleSet.fontWeight;
      node.style.borderColor = styleSet.borderColor;
      node.style.borderRadius = styleSet.borderRadius;

      requestAnimationFrame(() => {
         this.flowEditor.instance.revalidate(node);
         this.flowEditor.updatePaths();
      });
      this.updateNodePanel(node);
   }

   showEndpoint() {
      const points =
         this.flowEditor.containerEl.querySelectorAll('.jtk-endpoint');
      if (points.length === 0) return;

      if (points[0].classList.contains('show')) {
         points.forEach((point) => point.classList.remove('show'));
      } else {
         points.forEach((point) => point.classList.add('show'));
      }
   }

   addBaseNode() {
      if (!this.flowEditor.editable) return;
      const y = window.scrollY || window.pageYOffset;
      const newNode = {
         id: `new-node-${Date.now()}`,
         type: 'square',
         x: 20,
         y: y + 50,
         width: 140,
         height: 30,
         backgroundColor: 'ffffff',
         color: '444444',
         fontSize: 14,
         fontWeight: 400,
         borderColor: 'dddddf',
         borderRadius: 10,
         label: '노드',
      };

      this.flowEditor.createNodeElement(newNode);
   }

   rgbToHex(rgb) {
      try {
         if (!rgb || rgb === 'transparent') return '#00000000'; // 기본값 투명

         // 이미 hex 형식일 경우
         if (rgb.startsWith('#')) {
            // 4자리 (#RGBA) → 8자리로 확장
            if (rgb.length === 5) {
               const r = rgb[1],
                  g = rgb[2],
                  b = rgb[3],
                  a = rgb[4];
               return '#' + r + r + g + g + b + b + a + a;
            }
            return rgb; // 그대로 반환 (#RRGGBB 또는 #RRGGBBAA)
         }

         const result = rgb.match(/\d+(\.\d+)?/g); // [R, G, B, A?]
         if (!result || result.length < 3) return '#00000000';

         const [r, g, b, a] = result;
         const hex =
            '#' +
            [r, g, b]
               .map((x) => Number(x).toString(16).padStart(2, '0'))
               .join('') +
            (a !== undefined
               ? Math.round(parseFloat(a) * 255)
                    .toString(16)
                    .padStart(2, '0')
               : 'ff'); // a 없으면 불투명

         return hex;
      } catch (e) {
         console.log(e);
         return '#00000000';
      }
   }

   updateNodePanel(nodeEl) {
      // 패널 전환
      document.getElementById('property-panel').style.display = 'block';
      document.getElementById('node-properties').style.display = 'block';
      document.getElementById('connection-properties').style.display = 'none';

      // 패널 값 업데이트
      const span = nodeEl.querySelector('span');
      document.getElementById('prop-text').value = span?.innerText || '';

      document.getElementById('prop-width').value =
         parseInt(nodeEl.style.width) || 0;
      document.getElementById('prop-height').value =
         parseInt(nodeEl.style.height) || 0;

      if (nodeEl.classList.contains('diamond')) {
         this.nodeBg = this.backgroundImageHex(nodeEl, 'fill') || '#ffffff';
         this.nodeBorder =
            this.backgroundImageHex(nodeEl, 'stroke') || '#a7a7a7';
      } else {
         this.nodeBg = nodeEl.style.backgroundColor;
         this.nodeBorder = nodeEl.style.borderColor;
      }

      // ✅ 색상 적용만 수행
      this.pickrBg.setColor(this.nodeBg);
      this.pickrBorder.setColor(this.nodeBorder);

      document.getElementById('prop-fontsize').value =
         parseInt(nodeEl.style.fontSize) || 14;

      document.getElementById('prop-fontcolor').value = this.rgbToHex(
         nodeEl.style.color || '#000000'
      ).slice(0, 7);

      document.getElementById('prop-fontweight').value =
         parseInt(nodeEl.style.fontWeight) || 400;
   }

   updateConnectionPanel(conn) {
      // 패널 전환
      document.getElementById('property-panel').style.display = 'block';
      document.getElementById('node-properties').style.display = 'none';
      document.getElementById('connection-properties').style.display = 'block';

      // 패널 값 업데이트
      const strokeColor = conn.getPaintStyle().stroke || '#999999';
      document.getElementById('prop-conn-color').value = this.rgbToHex(
         strokeColor
      ).slice(0, 7);

      const labelOverlay = conn.getOverlay('labelOverlay');

      document.getElementById('prop-conn-label').value =
         labelOverlay?.getLabel() || '';

      const labelClass =
         labelOverlay?.canvas?.classList?.value
            ?.split(' ')
            ?.find((cls) => cls.startsWith('label-'))
            ?.replace('label-', '') || '';

      if (labelOverlay) {
         document.getElementById('prop-conn-fontsize').value =
            parseInt(window.getComputedStyle(labelOverlay?.canvas).fontSize) ||
            14;
      } else {
         document.getElementById('prop-conn-fontsize').value = 11;
      }

      document.getElementById('prop-conn-label-type').value = labelClass;
   }

   bindUIEvents() {
      if (!this.flowEditor.editable) return;
      // font size 변경
      document.getElementById('prop-fontsize').addEventListener('input', () => {
         const node = this.flowEditor.selectedNode;
         if (node) {
            node.style.fontSize =
               document.getElementById('prop-fontsize').value + 'px';
         }
      });

      // font color 변경
      document
         .getElementById('prop-fontcolor')
         .addEventListener('input', () => {
            const node = this.flowEditor.selectedNode;
            if (node) {
               node.style.color =
                  document.getElementById('prop-fontcolor').value;
            }
         });

      // font weight 변경
      document
         .getElementById('prop-fontweight')
         .addEventListener('change', () => {
            const node = this.flowEditor.selectedNode;
            if (node) {
               node.style.fontWeight =
                  document.getElementById('prop-fontweight').value;
            }
         });

      // node text
      document.getElementById('prop-text').addEventListener('input', () => {
         const node = this.flowEditor.selectedNode;
         if (node) {
            const span = node.querySelector('span');
            span.innerText = document.getElementById('prop-text').value;
         }
      });

      // node width
      document.getElementById('prop-width').addEventListener('input', () => {
         const node = this.flowEditor.selectedNode;
         if (node) {
            node.style.width =
               document.getElementById('prop-width').value + 'px';
            requestAnimationFrame(() => {
               this.flowEditor.instance.revalidate(node);
            });
         }
      });

      // node height
      document.getElementById('prop-height').addEventListener('input', () => {
         const node = this.flowEditor.selectedNode;
         if (node) {
            node.style.height =
               document.getElementById('prop-height').value + 'px';
            requestAnimationFrame(() => {
               this.flowEditor.instance.revalidate(node);
            });
         }
      });

      // connection color
      document
         .getElementById('prop-conn-color')
         .addEventListener('input', () => {
            const conn = this.flowEditor.selectedConnection;
            if (conn) {
               conn.setPaintStyle({
                  stroke: document.getElementById('prop-conn-color').value,
                  strokeWidth: 1,
               });
            }
         });

      // connection label
      document
         .getElementById('prop-conn-label')
         .addEventListener('input', () => {
            const conn = this.flowEditor.selectedConnection;
            if (conn) {
               const value = document
                  .getElementById('prop-conn-label')
                  .value.trim();

               const labelOverlay = conn.getOverlay('labelOverlay');

               if (value === '') {
                  if (labelOverlay) {
                     conn.removeOverlay('labelOverlay');
                  }
               } else {
                  let overlay = labelOverlay;
                  if (!overlay) {
                     overlay = conn.addOverlay([
                        'Label',
                        {
                           id: 'labelOverlay',
                           label: value,
                           location: 0.5,
                           cssClass: '',
                        },
                     ]);

                     // ⭐⭐ labelOverlay 생성 시 → 위치 조정
                     if (overlay?.canvas) {
                        const connSvg = conn.getConnector().canvas;
                        const labelEl = overlay.canvas;
                        connSvg.parentNode.insertBefore(
                           labelEl,
                           connSvg.nextSibling
                        );
                     }
                  } else {
                     overlay.setLabel(value);
                  }
               }
            }
         });
      // connection label font size
      document
         .getElementById('prop-conn-fontsize')
         .addEventListener('change', (e) => {
            const newFontSize = e.target.value;
            const labelEl =
               this.flowEditor.selectedConnection.getOverlay(
                  'labelOverlay'
               )?.canvas;
            if (labelEl) {
               labelEl.style.fontSize = `${newFontSize}px`;
            }
         });
      // connection label type
      document
         .getElementById('prop-conn-label-type')
         .addEventListener('change', () => {
            const conn = this.flowEditor.selectedConnection;
            if (conn) {
               const labelOverlay = conn.getOverlay('labelOverlay');
               if (labelOverlay && labelOverlay.canvas) {
                  const canvas = labelOverlay.canvas;

                  // 기존 label-xxx 클래스 제거
                  canvas.classList.forEach((cls) => {
                     if (cls.startsWith('label-')) {
                        canvas.classList.remove(cls);
                     }
                  });

                  const newType = document.getElementById(
                     'prop-conn-label-type'
                  ).value;
                  if (newType) {
                     canvas.classList.add(`label-${newType}`);
                  }
               }
            }
         });
      document.querySelectorAll('#node-style-buttons button').forEach((btn) => {
         btn.addEventListener('click', () => {
            const styleType = btn.getAttribute('data-style');

            // 선택 상태 초기화
            document
               .querySelectorAll('#node-style-buttons button')
               .forEach((b) => {
                  b.classList.remove('selected-style');
               });

            // 현재 버튼만 강조
            btn.classList.add('selected-style');

            this.changeStyle(styleType);
         });
      });
      this.flowEditor.containerEl.addEventListener('click', (e) => {
         // 노드나 연결선 내부가 아닌 경우에만 처리
         if (
            !e.target.closest('.flow-node') &&
            !e.target.closest('svg.jtk-connector') &&
            !e.target.closest('.waypoint')
         ) {
            if (this.flowEditor.selectedNode) {
               this.flowEditor.selectedNode.classList.remove('selected-node');
               this.flowEditor.selectedNode = null;
            }
            if (this.flowEditor.selectedConnection) {
               const svgEl =
                  this.flowEditor.selectedConnection.getConnector().canvas;
               svgEl.classList.remove('selected-connection');
               this.flowEditor.selectedConnection = null;
            }

            // 👉 패널도 닫고 싶으면 아래도 추가 가능
            document.getElementById('property-panel').style.display = 'none';
         }
      });
      document.addEventListener('keydown', (e) => {
         if (e.key === 'Delete') {
            if (this.flowEditor.selectedConnection) {
               this.flowEditor.instance.deleteConnection(
                  this.flowEditor.selectedConnection
               );
               this.flowEditor.selectedConnection = null;
               document.getElementById('property-panel').style.display = 'none';
            } else if (this.flowEditor.selectedNode) {
               // 1. 해당 노드에 연결된 커넥션 모두 제거
               this.flowEditor.instance.deleteConnectionsForElement(
                  this.flowEditor.selectedNode
               );

               // 2. 노드 DOM 제거
               this.flowEditor.selectedNode.remove();

               // 3. 선택 해제
               this.flowEditor.selectedNode = null;
               document.getElementById('property-panel').style.display = 'none';
            }
         }
      });
   }

   backgroundImageHex(nodeEl, attrType = 'fill') {
      const bg = window.getComputedStyle(nodeEl).backgroundImage;

      try {
         const decoded = decodeURIComponent(bg);
         const regex = new RegExp(`${attrType}="(#[a-fA-F0-9]{6,8})"`);
         const match = decoded.match(regex);
         return match?.[1] || null;
      } catch (e) {
         return null;
      }
   }

   makeDiamondBackground(fill, stroke) {
      if (!this._diamondCache) {
         this._diamondCache = new Map(); // 초기화
      }

      const key = `${fill}_${stroke}`; // 조합을 유일한 키로

      // 이미 존재하면 캐시 반환
      if (this._diamondCache.has(key)) {
         return this._diamondCache.get(key);
      }

      // 새로 생성
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 100" preserveAspectRatio="none">
          <polygon points="80,0 160,50 80,100 0,50" stroke="${stroke}" stroke-width="1" fill="${fill}" />
        </svg>`;

      const encoded = `url("data:image/svg+xml;utf8,${encodeURIComponent(
         svg.trim().replace(/\s+/g, ' ')
      )}")`;

      // 캐시에 저장
      this._diamondCache.set(key, encoded);

      return encoded;
   }

   exportToJson() {
      const nodeElements =
         this.flowEditor.containerEl.querySelectorAll('.flow-node');
      const nodes = Array.from(nodeElements).map((nodeEl) => {
         const rect = nodeEl.getBoundingClientRect();
         const canvasRect = this.flowEditor.containerEl.getBoundingClientRect();
         let dtype, dbg, dborder;
         if (nodeEl.classList.contains('diamond')) {
            dtype = 'diamond';
            dbg = this.backgroundImageHex(nodeEl, 'fill').replace('#', '');
            dborder = this.backgroundImageHex(nodeEl, 'stroke').replace(
               '#',
               ''
            );
         }

         return {
            id: nodeEl.id,
            type: dtype || 'square',
            x: rect.left - canvasRect.left,
            y: rect.top - canvasRect.top,
            width: parseInt(nodeEl.style.width),
            height: parseInt(nodeEl.style.height),
            backgroundColor:
               dbg ||
               this.rgbToHex(nodeEl.style.backgroundColor).replace('#', ''),
            color: this.rgbToHex(nodeEl.style.color).replace('#', ''),
            fontSize: parseInt(nodeEl.style.fontSize),
            fontWeight: parseInt(nodeEl.style.fontWeight),
            borderColor:
               dborder ||
               this.rgbToHex(nodeEl.style.borderColor).replace('#', ''),
            borderRadius: parseInt(nodeEl.style.borderRadius),
            label: nodeEl.querySelector('span')?.innerHTML || '',
         };
      });

      const connections = this.flowEditor.instance
         .getAllConnections()
         .map((conn) => {
            return {
               source: conn.sourceId,
               target: conn.targetId,
               anchors: [
                  conn.endpoints[0]?.anchor?.type || 'Continuous',
                  conn.endpoints[1]?.anchor?.type || 'Continuous',
               ],
               borderColor:
                  conn.getPaintStyle().stroke.replace('#', '') || '999999',
               label: conn.getOverlay('labelOverlay')?.getLabel() || '',
               fontSize:
                  parseInt(
                     conn.getOverlay('labelOverlay')?.canvas.style.fontSize
                  ) || '',
               labelType:
                  conn
                     .getOverlay('labelOverlay')
                     ?.canvas?.classList?.value?.split(' ')
                     ?.find((cls) => cls.startsWith('label-'))
                     ?.replace('label-', '') || '',
            };
         });

      const exportData = {
         nodes: nodes,
         connections: connections,
      };

      this.exportData = exportData;

      const jsonString = JSON.stringify(exportData, null, 2);

      document.getElementById('outputJSON').innerText = jsonString;
   }

   pickrSetting() {
      if (this.flowEditor.containerEl.id == 'canvas2') return;

      const pickerset = {
         theme: 'monolith', // 테마: 'classic', 'monolith', 'nano'
         autoReposition: true,
         closeOnScroll: true,

         components: {
            palette: true,
            preview: true,
            opacity: true, // ✔ 투명도 조절 가능
            hue: true,

            interaction: {
               hex: true,
               rgba: true,
               input: true,
               save: true,
               clear: true,
            },
         },
         i18n: {
            'btn:save': '저장',
            'btn:cancel': '취소',
            'btn:clear': '초기화',
         },
      };

      const propBgColor = Pickr.create({
         ...pickerset,
         el: '#prop-bgcolor',
      });

      const propBorderColor = Pickr.create({
         ...pickerset,
         el: '#prop-bordercolor',
      });

      this.pickrBg = propBgColor; // 저장
      this.pickrBorder = propBorderColor;

      // this.pickrBg.movePopupTo(document.getElementById('prop-bgcolor'));
      // this.pickrBorder.movePopupTo(document.getElementById('prop-bordercolor'));

      this.bindPickrEvents(this.pickrBg, 'bg');
      this.bindPickrEvents(this.pickrBorder, 'border');
   }

   bindPickrEvents(pickrInstance, type) {
      pickrInstance.on('change', (color) => {
         const node = this.flowEditor.selectedNode;
         if (!node) return;

         const previewColor = color.toHEXA().toString();

         if (node.classList.contains('diamond')) {
            const fill = type === 'bg' ? previewColor : this.nodeBg;
            const stroke = type === 'border' ? previewColor : this.nodeBorder;
            node.style.backgroundImage = this.makeDiamondBackground(
               fill,
               stroke
            );
         } else {
            if (type === 'bg') {
               node.style.backgroundColor = previewColor;
            } else {
               node.style.borderColor = previewColor;
            }
         }
      });

      pickrInstance.on('save', (color) => {
         const node = this.flowEditor.selectedNode;
         if (!node) return;

         const savedColor = color.toHEXA().toString();

         if (type === 'bg') {
            this.nodeBg = savedColor;
         } else {
            this.nodeBorder = savedColor;
         }

         if (node.classList.contains('diamond')) {
            node.style.backgroundImage = this.makeDiamondBackground(
               this.nodeBg,
               this.nodeBorder
            );
         } else {
            if (type === 'bg') {
               node.style.backgroundColor = this.nodeBg;
            } else {
               node.style.borderColor = this.nodeBorder;
            }
         }
      });

      pickrInstance.on('clear', () => {
         const node = this.flowEditor.selectedNode;
         if (!node) return;

         if (type === 'bg') {
            this.nodeBg = 'transparent';
         } else {
            this.nodeBorder = 'transparent';
         }

         if (node.classList.contains('diamond')) {
            node.style.backgroundImage = this.makeDiamondBackground(
               this.nodeBg,
               this.nodeBorder
            );
         } else {
            if (type === 'bg') {
               node.style.backgroundColor = 'transparent';
            } else {
               node.style.borderColor = 'transparent';
            }
         }
      });

      pickrInstance.on('cancel', (instance) => {
         const node = this.flowEditor.selectedNode;
         if (!node) return;

         if (node.classList.contains('diamond')) {
            node.style.backgroundImage = this.makeDiamondBackground(
               this.nodeBg,
               this.nodeBorder
            );
         } else {
            if (type === 'bg') {
               node.style.backgroundColor = this.nodeBg;
            } else {
               node.style.borderColor = this.nodeBorder;
            }
         }

         instance.setColor(type === 'bg' ? this.nodeBg : this.nodeBorder);
      });
   }

   interactSetting(nodeEl) {
      if (!this.flowEditor.editable) return;
      const node = '#' + nodeEl.id;
      interact(node).resizable({
         edges: {
            top: '.resize-line.top, .resize-handle.top-left, .resize-handle.top-right',
            bottom:
               '.resize-line.bottom, .resize-handle.bottom-left, .resize-handle.bottom-right',
            left: '.resize-line.left, .resize-handle.top-left, .resize-handle.bottom-left',
            right: '.resize-line.right, .resize-handle.top-right, .resize-handle.bottom-right',
         },
         listeners: {
            move(event) {
               const target = event.target;
               const x =
                  (parseFloat(target.style.left) || 0) + event.deltaRect.left;
               const y =
                  (parseFloat(target.style.top) || 0) + event.deltaRect.top;

               target.style.width = event.rect.width + 'px';
               target.style.height = event.rect.height + 'px';
               document.getElementById('prop-width').value = event.rect.width;
               document.getElementById('prop-height').value = event.rect.width;

               target.style.left = x + 'px';
               target.style.top = y + 'px';
            },
            end: () => {
               this.flowEditor.instance.repaintEverything();
               this.flowEditor.updatePaths();
            },
         },
         modifiers: [
            interact.modifiers.restrictSize({
               min: { width: 50, height: 30 },
               max: { width: 800, height: 600 },
            }),
            interact.modifiers.snapSize({
               targets: [interact.snappers.grid({ width: 10, height: 10 })],
            }),
         ],
         inertia: true,
      });
   }
}

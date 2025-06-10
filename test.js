import { FlowEditor } from './flowEditor.js';

const editor = new FlowEditor('canvas');

fetch('demo.json')
   .then((response) => response.json())
   .then((data) => {
      editor.loadData(data);
   });

// 버튼 연결
document.getElementById('btnAddNode').addEventListener('click', () => {
   editor.addBaseNode();
});

document.getElementById('btnShowEndpoint').addEventListener('click', () => {
   editor.showEndpoint();
});

document.getElementById('btnExport').addEventListener('click', () => {
   editor.exportToJson();
});

document.getElementById('renderCanvas2').addEventListener('click', () => {
   document.getElementById('canvas2').innerHTML = ''; // 초기화

   const exportData = editor.ui.exportData; // 기존 데이터 대신 JSON 복사본

   const editor2 = new FlowEditor('canvas2'); // 새로운 FlowEditor 인스턴스
   editor2.loadData(exportData); // 똑같이 불러오기만 하면 끝
});

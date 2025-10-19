import React, { useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, TransformControls, Grid, Html, useGLTF, PerspectiveCamera } from "@react-three/drei";
import create from "zustand";

// Simple store for scene state (Zustand)
const useStore = create((set, get) => ({
  objects: [],
  selectedId: null,
  undoStack: [],
  redoStack: [],
  addObject(obj) {
    set((s) => ({ objects: [...s.objects, obj] }));
    get().pushUndo();
  },
  updateObject(id, patch) {
    set((s) => ({ objects: s.objects.map(o => o.id === id ? {...o, ...patch} : o) }));
    get().pushUndo();
  },
  removeObject(id) {
    set((s) => ({ objects: s.objects.filter(o => o.id !== id), selectedId: s.selectedId === id ? null : s.selectedId }));
    get().pushUndo();
  },
  select(id) { set({ selectedId: id }); },
  pushUndo() {
    const snapshot = JSON.stringify({ objects: get().objects });
    set((s) => ({ undoStack: [...s.undoStack, snapshot], redoStack: [] }));
  },
  undo() {
    const { undoStack, redoStack } = get();
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    set((s) => ({ redoStack: [...s.redoStack, JSON.stringify({ objects: s.objects })], undoStack: s.undoStack.slice(0, -1) }));
    const parsed = JSON.parse(last);
    set({ objects: parsed.objects, selectedId: null });
  },
  redo() {
    const { redoStack } = get();
    if (redoStack.length === 0) return;
    const last = redoStack[redoStack.length - 1];
    set((s) => ({ undoStack: [...s.undoStack, JSON.stringify({ objects: s.objects })], redoStack: s.redoStack.slice(0, -1) }));
    const parsed = JSON.parse(last);
    set({ objects: parsed.objects, selectedId: null });
  }
}));

// Utility to generate simple IDs
const id = (prefix = "obj") => `${prefix}_${Math.random().toString(36).slice(2,9)}`;

// Placeholder 3D furniture — simple boxes (could be replaced by glTF models)
function FurnitureMesh({ item, isSelected, onSelect }) {
  const ref = useRef();
  useFrame(() => {
    if (ref.current) {
      ref.current.position.x = item.position[0];
      ref.current.position.y = item.position[1];
      ref.current.position.z = item.position[2];
      ref.current.rotation.y = item.rotation || 0;
    }
  });
  return (
    <mesh ref={ref} onClick={(e) => { e.stopPropagation(); onSelect(item.id); }} castShadow receiveShadow>
      <boxGeometry args={item.size} />
      <meshStandardMaterial metalness={0.1} roughness={0.7} color={item.color} />
      {isSelected && (
        <Html center distanceFactor={8} position={[0, item.size[1] / 2 + 0.05, 0]}>
          <div className="bg-white p-1 shadow rounded text-xs">{item.name}</div>
        </Html>
      )}
    </mesh>
  );
}

function SceneRoot() {
  const objects = useStore((s) => s.objects);
  const select = useStore((s) => s.select);
  const selectedId = useStore((s) => s.selectedId);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight intensity={0.8} position={[5, 10, 5]} castShadow />
      <gridHelper args={[20, 20]} rotation={[Math.PI / 2, 0, 0]} />
      <mesh rotation={[-Math.PI/2, 0, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#f5f4f1" />
      </mesh>

      {objects.map((o) => (
        <FurnitureMesh key={o.id} item={o} isSelected={o.id === selectedId} onSelect={select} />
      ))}
    </>
  );
}

// Simple camera controls + ability to toggle between perspective/orthographic settings (stub)
function CameraControls({ enableOrbit = true }) {
  const { camera, gl } = useThree();
  return <OrbitControls args={[camera, gl.domElement]} enablePan={true} enableZoom={true} enableRotate={true} />;
}

export default function RoomDesignerApp() {
  const addObject = useStore((s) => s.addObject);
  const objects = useStore((s) => s.objects);
  const selectedId = useStore((s) => s.selectedId);
  const updateObject = useStore((s) => s.updateObject);
  const removeObject = useStore((s) => s.removeObject);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);

  const [categoryFilter, setCategoryFilter] = useState("All");
  const [mode, setMode] = useState("layout"); // layout | camera | render

  // Example furniture library (category, presets)
  const library = {
    Seating: [
      { name: "Sofa (2P)", size: [2, 0.9, 0.9], color: "#8b5cf6" },
      { name: "Armchair", size: [0.9, 0.9, 0.9], color: "#f97316" }
    ],
    Tables: [
      { name: "Coffee Table", size: [1.2, 0.35, 0.6], color: "#b09167" },
      { name: "Dining Table", size: [2, 0.75, 1], color: "#6b7280" }
    ],
    Storage: [
      { name: "Bookshelf", size: [0.8, 2, 0.3], color: "#374151" }
    ],
    Decor: [
      { name: "Rug", size: [2, 0.02, 1.5], color: "#ef4444" }
    ]
  };

  function handleAddFromLib(item, category) {
    const newObj = {
      id: id("f"),
      name: item.name,
      category,
      size: item.size,
      position: [0, item.size[1] / 2, 0],
      rotation: 0,
      color: item.color || "#cccccc",
      meta: {}
    };
    addObject(newObj);
  }

  function handleColorChange(hex) {
    if (!selectedId) return;
    updateObject(selectedId, { color: hex });
  }

  function exportPNG() {
    // Basic exporting idea: capture canvas and download — actual impl needs canvas ref
    alert("Export: 현재는 데모입니다. 실제 캡처 기능은 추가 설정 필요합니다.");
  }

  return (
    <div className="h-screen w-screen flex text-sm">
      {/* Left: Library */}
      <aside className="w-72 bg-white border-r p-3 flex flex-col gap-3">
        <h2 className="text-lg font-semibold">가구 라이브러리</h2>
        <div className="flex gap-2">
          <button className={`px-2 py-1 rounded ${categoryFilter === 'All' ? 'bg-gray-200' : ''}`} onClick={() => setCategoryFilter('All')}>모두</button>
          {Object.keys(library).map(cat => (
            <button key={cat} className={`px-2 py-1 rounded ${categoryFilter === cat ? 'bg-gray-200' : ''}`} onClick={() => setCategoryFilter(cat)}>{cat}</button>
          ))}
        </div>
        <div className="overflow-auto flex-1">
          {Object.entries(library).map(([cat, items]) => (
            (categoryFilter === 'All' || categoryFilter === cat) && (
              <div key={cat} className="mb-2">
                <h3 className="font-medium">{cat}</h3>
                <div className="grid grid-cols-1 gap-2 mt-1">
                  {items.map((it, i) => (
                    <div key={i} className="p-2 border rounded flex items-center justify-between">
                      <div>
                        <div className="font-medium">{it.name}</div>
                        <div className="text-xs text-gray-500">{it.size.join('×')}</div>
                      </div>
                      <div className="flex gap-2">
                        <div style={{ width: 24, height: 24, background: it.color }} className="rounded" />
                        <button className="px-2 py-1 bg-sky-500 text-white rounded" onClick={() => handleAddFromLib(it, cat)}>추가</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>

        <div className="flex gap-2">
          <button className="flex-1 px-2 py-1 rounded border" onClick={() => undo()}>되돌리기</button>
          <button className="flex-1 px-2 py-1 rounded border" onClick={() => redo()}>다시</button>
        </div>

        <div className="mt-2">
          <h4 className="font-medium">모드</h4>
          <div className="flex gap-2 mt-1">
            <button className={`px-2 py-1 rounded ${mode === 'layout' ? 'bg-gray-200' : ''}`} onClick={() => setMode('layout')}>배치</button>
            <button className={`px-2 py-1 rounded ${mode === 'camera' ? 'bg-gray-200' : ''}`} onClick={() => setMode('camera')}>카메라</button>
            <button className={`px-2 py-1 rounded ${mode === 'render' ? 'bg-gray-200' : ''}`} onClick={() => setMode('render')}>렌더</button>
          </div>
        </div>

      </aside>

      {/* Main 3D area */}
      <main className="flex-1 relative bg-gray-50">
        <Canvas shadows camera={{ position: [5, 5, 5], fov: 45 }}>
          <PerspectiveCamera makeDefault position={[5, 5, 5]} />
          <CameraControls />
          <SceneRoot />
        </Canvas>

        {/* Top toolbar */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur rounded shadow p-2 flex gap-2">
          <button className="px-2 py-1 border rounded" onClick={() => alert('Undo action')}>Undo</button>
          <button className="px-2 py-1 border rounded" onClick={() => alert('Redo action')}>Redo</button>
          <button className="px-2 py-1 border rounded" onClick={() => exportPNG()}>카메라 캡처 (웹툰용)</button>
          <div className="px-2 py-1 border rounded">렌더 모드: 기본</div>
        </div>

        {/* Right: inspector */}
        <aside className="absolute right-4 top-16 w-64 bg-white border p-3 rounded shadow">
          <h3 className="font-semibold">속성 검사기</h3>
          {selectedId ? (
            (() => {
              const obj = objects.find(o => o.id === selectedId);
              if (!obj) return <div>선택된 항목 없음</div>;
              return (
                <div className="mt-2 space-y-2">
                  <div>
                    <div className="text-xs text-gray-500">이름</div>
                    <input className="w-full border px-2 py-1 rounded" value={obj.name} onChange={(e) => updateObject(obj.id, { name: e.target.value })} />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">색상</div>
                    <input type="color" value={obj.color} onChange={(e) => handleColorChange(e.target.value)} className="w-full h-8 p-0 border rounded" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">위치 X Z</div>
                    <div className="flex gap-2">
                      <input className="w-1/2 border px-2 py-1 rounded" value={obj.position[0]} onChange={(e) => updateObject(obj.id, { position: [parseFloat(e.target.value||0), obj.position[1], obj.position[2]] })} />
                      <input className="w-1/2 border px-2 py-1 rounded" value={obj.position[2]} onChange={(e) => updateObject(obj.id, { position: [obj.position[0], obj.position[1], parseFloat(e.target.value||0)] })} />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">회전(Y)</div>
                    <input className="w-full border px-2 py-1 rounded" value={obj.rotation} onChange={(e) => updateObject(obj.id, { rotation: parseFloat(e.target.value||0) })} />
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 px-2 py-1 border rounded" onClick={() => removeObject(obj.id)}>삭제</button>
                    <button className="flex-1 px-2 py-1 border rounded" onClick={() => updateObject(obj.id, { position: [0, obj.position[1], 0] })}>리셋 위치</button>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="text-sm text-gray-500 mt-2">가구를 선택하면 세부 속성을 편집할 수 있습니다.</div>
          )}
        </aside>

      </main>
    </div>
  );
}

/*
이 파일은 스타터 템플릿입니다.
포함된 기능:
- React + react-three-fiber 기반 3D 캔버스
- 간단한 가구 라이브러리(박스 형태로 대체 가능)
- 사이드바에서 가구 추가, 선택 시 속성 편집
- 색상, 위치, 회전 편집
- Undo/Redo(간단한 스냅샷 방식)
- 카메라 제어(OrbitControls)

다음 단계 제안:
- glTF/GLB 모델 로드(실제 가구 자산) — useGLTF를 사용
- TransformControls를 연결하여 드래그/회전/스케일 편집
- 캔버스 캡처/이미지 다운로더 구현 (웹툰 패널 추출용)
- 카메라 프리셋(프레임, 초점거리, DOF) 및 카메라 애니메이션
- 월/바닥에 스냅, 물리 충돌 및 레이캐스트 기반 정렬
- 재질(Metalness/Roughness/Texture) 및 라이팅 프리셋
- 저장/불러오기(로컬스토리지, 백엔드 API 또는 파일 내보내기)
- 사용자 계정, 에셋 마켓플레이스, 버전 관리
*/

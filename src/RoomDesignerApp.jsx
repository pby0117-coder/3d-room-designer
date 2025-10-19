import React, { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, GridHelper, Html, PerspectiveCamera } from "@react-three/drei";
import create from "zustand";

// 🏗 Zustand 스토어: 오브젝트 상태 관리
const useStore = create((set, get) => ({
  objects: [],
  selectedId: null,
  addObject(obj) {
    set((s) => ({ objects: [...s.objects, obj] }));
  },
  select(id) {
    set({ selectedId: id });
  },
  updateObject(id, patch) {
    set((s) => ({
      objects: s.objects.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    }));
  },
  removeObject(id) {
    set((s) => ({
      objects: s.objects.filter((o) => o.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    }));
  },
}));

// 🛋 기본 가구 박스
function FurnitureMesh({ item }) {
  const ref = useRef();
  const select = useStore((s) => s.select);
  const selectedId = useStore((s) => s.selectedId);
  const isSelected = selectedId === item.id;

  useFrame(() => {
    if (ref.current) {
      ref.current.position.set(...item.position);
      ref.current.rotation.y = item.rotation || 0;
    }
  });

  return (
    <mesh
      ref={ref}
      onClick={(e) => { e.stopPropagation(); select(item.id); }}
      castShadow
      receiveShadow
    >
      <boxGeometry args={item.size} />
      <meshStandardMaterial color={item.color} metalness={0.1} roughness={0.7} />
      {isSelected && (
        <Html center distanceFactor={8} position={[0, item.size[1] / 2 + 0.05, 0]}>
          <div style={{ background: "white", padding: "2px 5px", borderRadius: "3px", fontSize: "12px" }}>
            {item.name}
          </div>
        </Html>
      )}
    </mesh>
  );
}

// 🖼 장면
function SceneRoot() {
  const objects = useStore((s) => s.objects);
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight intensity={0.8} position={[5, 10, 5]} castShadow />
      <gridHelper args={[20, 20]} rotation={[Math.PI / 2, 0, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#f5f4f1" />
      </mesh>
      {objects.map((o) => (
        <FurnitureMesh key={o.id} item={o} />
      ))}
    </>
  );
}

// 🖱 OrbitControls
function CameraControls() {
  return <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />;
}

// 🎨 앱 메인
export default function RoomDesignerApp() {
  const addObject = useStore((s) => s.addObject);
  const selectedId = useStore((s) => s.selectedId);
  const objects = useStore((s) => s.objects);
  const updateObject = useStore((s) => s.updateObject);
  const removeObject = useStore((s) => s.removeObject);

  // 간단한 가구 라이브러리
  const library = [
    { name: "소파", size: [2, 0.9, 0.9], color: "#8b5cf6" },
    { name: "의자", size: [0.9, 0.9, 0.9], color: "#f97316" },
    { name: "책상", size: [1.5, 0.75, 0.8], color: "#6b7280" },
    { name: "책장", size: [0.8, 2, 0.3], color: "#374151" },
  ];

  function handleAdd(item) {
    const newObj = {
      id: Math.random().toString(36).slice(2, 9),
      name: item.name,
      size: item.size,
      position: [0, item.size[1] / 2, 0],
      rotation: 0,
      color: item.color,
    };
    addObject(newObj);
  }

  return (
    <div className="h-screen w-screen flex">
      {/* 왼쪽 가구 라이브러리 */}
      <aside className="w-72 bg-white border-r p-3 flex flex-col gap-3">
        <h2 className="text-lg font-semibold">가구 라이브러리</h2>
        <div className="flex flex-col gap-2 overflow-auto">
          {library.map((item, i) => (
            <button
              key={i}
              className="p-2 border rounded bg-sky-500 text-white text-sm"
              onClick={() => handleAdd(item)}
            >
              {item.name}
            </button>
          ))}
        </div>
        {selectedId && (
          <div className="mt-3 p-2 border rounded">
            <h3 className="font-medium">선택된 가구 편집</h3>
            {(() => {
              const obj = objects.find((o) => o.id === selectedId);
              return (
                <div className="mt-2 flex flex-col gap-2">
                  <input
                    type="color"
                    value={obj.color}
                    onChange={(e) => updateObject(obj.id, { color: e.target.value })}
                    className="w-full h-8 border rounded"
                  />
                  <button
                    className="px-2 py-1 border rounded bg-red-500 text-white"
                    onClick={() => removeObject(obj.id)}
                  >
                    삭제
                  </button>
                </div>
              );
            })()}
          </div>
        )}
      </aside>

      {/* 메인 3D 캔버스 */}
      <main className="flex-1 relative bg-gray-50">
        <Canvas shadows camera={{ position: [5, 5, 5], fov: 45 }}>
          <PerspectiveCamera makeDefault position={[5, 5, 5]} />
          <CameraControls />
          <SceneRoot />
        </Canvas>
      </main>
    </div>
  );
}

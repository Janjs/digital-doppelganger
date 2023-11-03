import {
  CameraControls,
  ContactShadows,
  Environment,
  Text,
  useGLTF,
} from "@react-three/drei";
import {
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";
import { useChat } from "../hooks/useChat";
import { Avatar } from "./Avatar";

const Pumpkin = (props) => {

  const { nodes, materials } = useGLTF(
    "/models/pumpkin.glb"
  );
  return (
    <group {...props} dispose={null}>
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.mesh_0.geometry}
        material={nodes.mesh_0.material}
        position={[1.0, 0.3, 0.0]}
      />
    </group>
  );
};

useGLTF.preload(
  "/models/pumpkin.glb"
);

const Dots = (props) => {
  const { loading } = useChat();
  const [loadingText, setLoadingText] =
    useState("");
  useEffect(() => {
    if (loading) {
      const interval = setInterval(
        () => {
          setLoadingText(
            (loadingText) => {
              if (
                loadingText.length > 2
              ) {
                return ".";
              }
              return loadingText + ".";
            }
          );
        },
        800
      );
      return () =>
        clearInterval(interval);
    } else {
      setLoadingText("");
    }
  }, [loading]);
  if (!loading) return null;
  return (
    <group {...props}>
      <Text
        fontSize={0.14}
        anchorX={"left"}
        anchorY={"bottom"}
        position={[0.0, 0.1, 0.0]}
      >
        {loadingText}
        <meshBasicMaterial
          attach="material"
          color="white"
        />
      </Text>
    </group>
  );
};

export const Experience = () => {
  const cameraControls = useRef();
  const { cameraZoomed } = useChat();

  useEffect(() => {
    cameraControls.current.setLookAt(
      0,
      2,
      5,
      0,
      1.5,
      0
    );
  }, []);

  useEffect(() => {
    if (cameraZoomed) {
      cameraControls.current.setLookAt(
        0,
        1.5,
        1.5,
        0,
        1.5,
        0,
        true
      );
    } else {
      cameraControls.current.setLookAt(
        0,
        2.2,
        5,
        0,
        1.0,
        0,
        true
      );
    }
  }, [cameraZoomed]);
  return (
    <>
      <CameraControls
        ref={cameraControls}
      />
      <Environment preset="park" />
      {/* Wrapping Dots into Suspense to prevent Blink when Troika/Font is loaded */}
      <Suspense>
        <Dots
          position-y={1.75}
          position-x={-0.02}
        />
      </Suspense>
      <Avatar />
      <Suspense>
        <Pumpkin />
      </Suspense>
      <ContactShadows opacity={0.7} />
    </>
  );
};

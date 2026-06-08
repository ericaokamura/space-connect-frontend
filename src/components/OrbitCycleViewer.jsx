import { useEffect, useRef, useState } from "react";
import axios from "axios";

import * as Cesium from "cesium";

import "cesium/Build/Cesium/Widgets/widgets.css";

export default function OrbitCycleViewer() {
    const cesiumContainer = useRef(null);

    const [captureData, setCaptureData] = useState(null);

    useEffect(() => {

        window.CESIUM_BASE_URL = "/cesium";

        Cesium.Ion.defaultAccessToken =
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIyOWVmMTZlNy03M2M4LTRiOTEtOWFkZS0zZDZkNjBiMTA0NzgiLCJpZCI6NDM5NjA2LCJzdWIiOiJlcmljYW9rYW11cmEiLCJpc3MiOiJodHRwczovL2FwaS5jZXNpdW0uY29tIiwiYXVkIjoiRklBUCIsImlhdCI6MTc4MDg1MjI2MH0.OOdnLakDKBJryYYt2t-AxFLCYbufD09SA2JDbsz6_7U";

        const viewer = new Cesium.Viewer(
            cesiumContainer.current,
            {
                baseLayerPicker: false,
                animation: false,
                timeline: false
            }
        );

        const handler =
            new Cesium.ScreenSpaceEventHandler(
                viewer.scene.canvas
            );

        async function loadDebris() {
            try {
                const response = await axios.get(
                    "http://localhost:8080/space-connect/fetch"
                );

                const debris = response.data;

                debris.forEach((d) => {
                    const isDebris =
                        d.objectName?.includes("DEB");

                    viewer.entities.add({
                        id: d.noradId,

                        position: new Cesium.Cartesian3(
                            d.positionX,
                            d.positionY,
                            d.positionZ
                        ),

                        description: `
              <b>NORAD:</b> ${d.noradId}<br/>
              <b>OBJECT NAME:</b> ${d.objectName}<br/>
              <b>X:</b> ${d.positionX}<br/>
              <b>Y:</b> ${d.positionY}<br/>
              <b>Z:</b> ${d.positionZ}
            `,

                        point: {
                            pixelSize: 5,
                            color: isDebris
                                ? Cesium.Color.RED
                                : Cesium.Color.GREEN
                        }
                    });
                });
            } catch (error) {
                console.error(error);
            }
        }

        async function loadCaptureEstimate(noradId) {
            try {
                const response = await axios.get(
                    `http://localhost:8080/capture/estimate?noradId=${noradId}`
                );

                setCaptureData(response.data);
            } catch (error) {
                console.error(error);
            }
        }

        handler.setInputAction(
            async (click) => {
                const pickedObject =
                    viewer.scene.pick(click.position);

                if (!Cesium.defined(pickedObject)) {
                    return;
                }

                const entity = pickedObject.id;

                await loadCaptureEstimate(entity.id);
            },
            Cesium.ScreenSpaceEventType.LEFT_CLICK
        );

        loadDebris();

        return () => {
            handler.destroy();

            if (!viewer.isDestroyed()) {
                viewer.destroy();
            }
        };
    }, []);

    return (
        <>
            <div
                ref={cesiumContainer}
                style={{
                    width: "100%",
                    height: "100vh"
                }}
            />

            <div className="capture-panel">
                <h2>Análise de Captura</h2>

                {!captureData && (
                    <p>
                        Clique em um detrito para analisar.
                    </p>
                )}

                {captureData && (
                    <>
                        <h3>
                            {captureData.objectName}
                        </h3>

                        <p>
                            <b>NORAD:</b>{" "}
                            {captureData.noradId}
                        </p>

                        <p>
                            <b>Tipo:</b>{" "}
                            {captureData.objectType}
                        </p>

                        <p>
                            <b>Tamanho RCS:</b>{" "}
                            {captureData.rcsSize}
                        </p>

                        <hr />

                        <h4>Órbita</h4>

                        <p>
                            <b>Altitude:</b>{" "}
                            {captureData.currentAltitudeKm.toFixed(
                                2
                            )}{" "}
                            km
                        </p>

                        <p>
                            <b>Inclinação:</b>{" "}
                            {captureData.inclinationDeg.toFixed(
                                2
                            )}
                            °
                        </p>

                        <hr />

                        <h4>Missão</h4>

                        <p>
                            <b>ΔV:</b>{" "}
                            {captureData.deltaVms.toFixed(2)}
                            {" "}m/s
                        </p>

                        <p>
                            <b>Combustível:</b>{" "}
                            {captureData.fuelKg.toFixed(2)}
                            {" "}kg
                        </p>

                        <p>
                            <b>Transferência:</b>{" "}
                            {captureData.transferTimeHours.toFixed(
                                2
                            )}
                            {" "}h
                        </p>

                        <p>
                            <b>Chegada:</b>{" "}
                            {captureData.estimatedArrival}
                        </p>

                        <hr />

                        <h4>Custos</h4>

                        <p>
                            <b>Combustível:</b> $
                            {captureData.fuelCostUSD.toLocaleString()}
                        </p>

                        <p>
                            <b>Operações:</b> $
                            {captureData.operationsCostUSD.toLocaleString()}
                        </p>

                        <p
                            style={{
                                color: "#00ff88",
                                fontWeight: "bold"
                            }}
                        >
                            Total: $
                            {captureData.totalCostUSD.toLocaleString()}
                        </p>
                    </>
                )}
            </div>
        </>
    );
}
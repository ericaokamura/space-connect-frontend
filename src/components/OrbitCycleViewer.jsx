import { useEffect, useRef, useState } from "react";
import axios from "axios";

import * as Cesium from "cesium";

import "cesium/Build/Cesium/Widgets/widgets.css";

import logoOrbitCycle from "../assets/logo-orbitcycle.jpeg";


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

        const serviceSatellitePosition =
            new Cesium.Cartesian3(
                6778137,
                0,
                0
            );

        const serviceSatellite =
            viewer.entities.add({
                id: "SERVICE_SAT",

                position: serviceSatellitePosition,

                billboard: {
                    image: "./satellite.png",
                    width: 48,
                    height: 48,
                    verticalOrigin: Cesium.VerticalOrigin.CENTER
                },

                label: {
                    text: "Coletor"
                }
            });

        function animateCapture(
            satellite,
            targetPosition
        ) {

            const start =
                Cesium.JulianDate.now();

            const stop =
                Cesium.JulianDate.addSeconds(
                    start,
                    120,
                    new Cesium.JulianDate()
                );

            const startPosition =
                satellite.position.getValue(
                    viewer.clock.currentTime
                );

            const positionProperty =
                new Cesium.SampledPositionProperty();

            for (let i = 0; i <= 20; i++) {

                const fraction = i / 20;

                const interpolated =
                    Cesium.Cartesian3.lerp(
                        startPosition,
                        targetPosition,
                        fraction,
                        new Cesium.Cartesian3()
                    );

                positionProperty.addSample(
                    Cesium.JulianDate.addSeconds(
                        start,
                        fraction * 120,
                        new Cesium.JulianDate()
                    ),
                    interpolated
                );
            }

            satellite.position =
                positionProperty;

            satellite.path =
                new Cesium.PathGraphics({
                    width: 3,
                    material: Cesium.Color.CYAN
                });

            viewer.clock.startTime =
                start.clone();

            viewer.clock.stopTime =
                stop.clone();

            viewer.clock.currentTime =
                start.clone();

            viewer.clock.multiplier = 10;
            viewer.clock.shouldAnimate = true;

            const listener = () => {

                if (
                    Cesium.JulianDate.greaterThanOrEquals(
                        viewer.clock.currentTime,
                        stop
                    )
                ) {

                    viewer.clock.onTick.removeEventListener(
                        listener
                    );

                    satellite.position =
                        new Cesium.ConstantPositionProperty(
                            serviceSatellitePosition
                        );

                    satellite.path = undefined;
                }
            };

            viewer.clock.onTick.addEventListener(
                listener
            );

        }



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

                const debrisPosition =
                    entity.position.getValue(
                        Cesium.JulianDate.now()
                    );

                animateCapture(
                    serviceSatellite,
                    debrisPosition
                );

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
                <img src={logoOrbitCycle}></img>
                <h2 styles={{paddingTop:"10px"}}>Análise de Captura</h2>

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
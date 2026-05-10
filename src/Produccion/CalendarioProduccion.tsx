import { Scheduler } from "@bitnoi.se/react-scheduler";
import "@bitnoi.se/react-scheduler/dist/style.css";

export default function CalendarioProduccion() {

const data = [
    {
        id: "felipe",
        label: {
            icon: "👷",
            title: "Felipe",
            subtitle: "Operador"
        },
        data: [
            {
                id: "ot00093_1",
                startDate: new Date("2026-05-08"),
                endDate: new Date("2026-05-11"),
                title: "OT-00093.1",
                subtitle: "Cartucho Alta",
                bgColor: "#facc15",
                occupancy: 100
            }
        ]
    },
    {
        id: "luis",
        label: {
            icon: "👷",
            title: "Luis",
            subtitle: "Operador"
        },
        data: [
            {
                id: "ot00095_1",
                startDate: new Date("2026-05-09"),
                endDate: new Date("2026-05-13"),
                title: "OT-00095.1",
                subtitle: "Banda",
                bgColor: "#3b82f6",
                occupancy: 100
            }
        ]
    }
];

    return (
        <div
            style={{
                height: "700px",
                padding: "20px",
                background: "#f3f4f6"
            }}
        >
            <Scheduler data={data} />
        </div>
    );
}
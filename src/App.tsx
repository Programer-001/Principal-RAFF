import {
    Routes,
    Route,
    Navigate,
    useLocation,
    useNavigate,
} from "react-router-dom";
import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";

import { auth } from "./firebase/config";
import Login from "./auth/Acceso";

import Cotizador from "./cotizador";
import BuscarClientes from "./Clientes/Clientes";
import Envios from "./Envios/Envios";
import Menu from "./navbar/menu";
import GestionOT from "./GestionOT";
import Orden_compra from "./OrdenCompra/Orden_Compra";
import Productos_editor from "./Productos/Productos";
import Empleados from "./RH/Empleados";
import Permisos from "./RH/Permisos";
import CorteCaja from "./Facturacion/caja";
import CorteCajaPorFecha from "./Facturacion/caja_fecha";
import ConsultaGastos from "./Facturacion/Consulta_gastos";
import ContarDinero from "./Facturacion/ContarDinero";
import CorteDia from "./Facturacion/CorteDia";
import ModificarCaja from "./Facturacion/edicion_caja";
import Gastos from "./Facturacion/gastos";
import ModificarPago from "./Facturacion/ModificarPago";
import MostrarCaja from "./Facturacion/MostrarCaja";
import Lefor from "./Contabilidad/lefor"
import GestionProduccion from "./Produccion/GestionProduccion";
import InvAlmacen from "./Produccion/inv_almacen";
import Comisiones from "./Administracion/comisiones";
import Proveedores from "./Administracion/Proveedores";
import ComisionesMostrador from "./Administracion/comisiones_mostrador";
import PagosBanda from "./pagos_banda/PagosBanda";
import VisorPedidosEspeciales from "./Pedidos_especiales/visor_pedidos_especiales"
import Tienda from "./Tienda/Tienda"
import TiendaProductos from "./Tienda/TiendaProductos"
import Perfil from "./navbar/perfil";
import Home from "./Home/Home";
import "./styles.css";

function AppLayout() {
    const location = useLocation();
    const navigate = useNavigate();

    const rutaAVista = (pathname: string) => {
        if (pathname.startsWith("/cotizador")) return "cotizador";
        if (pathname.startsWith("/consultaot")) return "consultaot";
        if (pathname.startsWith("/clientes")) return "clientes";
        if (pathname.startsWith("/envios")) return "envios";
        if (pathname.startsWith("/compras")) return "compras";
        if (pathname.startsWith("/productos")) return "productos";
        if (pathname.startsWith("/empleados")) return "empleados";
        if (pathname.startsWith("/permisos")) return "permisos";
        if (pathname.startsWith("/caja")) return "caja";
        if (pathname.startsWith("/cajacorteporfecha")) return "cajacorteporfecha";
        if (pathname.startsWith("/consultagastos")) return "consultagastos";
        if (pathname.startsWith("/contardinero")) return "contardinero";
        if (pathname.startsWith("/cortedia")) return "cortedia";
        if (pathname.startsWith("/modificarcaja")) return "modificarcaja";
        if (pathname.startsWith("/gastos")) return "gastos";
        if (pathname.startsWith("/modificarpago")) return "modificarpago";
        if (pathname.startsWith("/mostrarcaja")) return "mostrarcaja";
        if (pathname.startsWith("/gestionproduccion")) return "gestionproduccion";
        if (pathname.startsWith("/invalmacen")) return "invalmacen";
        if (pathname.startsWith("/lefor")) return "lefor";
        if (pathname.startsWith("/comisiones")) return "comisiones";
        if (pathname.startsWith("/comisionesmostrador")) return "comisionesmostrador";
        if (pathname.startsWith("/proveedores")) return "proveedores";
        if (pathname.startsWith("/pago_banda")) return "pago_banda";
        if (pathname.startsWith("/pago_banda")) return "visor_pedidos_especiales";
        if (pathname.startsWith("/tienda_productos")) return "tienda_productos";
        if (pathname.startsWith("/perfil")) return "perfil";
        if (pathname.startsWith("/home")) return "home";
        return "home";
    };

    const vista = rutaAVista(location.pathname);

    const setVista = (v: string) => {
        const mapa: Record<string, string> = {
            cotizador: "/cotizador",
            consultaot: "/consultaot",
            clientes: "/clientes",
            envios: "/envios",
            compras: "/compras",
            productos: "/productos",
            empleados: "/empleados",
            permisos: "/permisos",
            caja: "/caja",
            cajacorteporfecha: "/cajacorteporfecha",
            consultagastos: "/consultagastos",
            contardinero: "/contardinero",
            cortedia: "/cortedia",
            modificarcaja: "/modificarcaja",
            gastos: "/gastos",
            modificarpago: "/modificarpago",
            mostrarcaja: "/mostrarcaja",
            lefor: "/lefor",
            gestionproduccion: "/gestionproduccion",
            invalmacen: "/invalmacen",
            comisiones: "/comisiones",
            comisionesmostrador: "/comisionesmostrador",
            proveedores: "/proveedores",
            pago_banda: "/pago_banda",
            visor_pedidos_especiales: "/visor_pedidos_especiales",
            tienda_productos:"/tienda_productos",
            perfil: "/perfil",
            home: "/home",
            
        };

        navigate(mapa[v] || "/home");
    };

    return (
        <div className="App">
            <Menu vista={vista} setVista={setVista} />

            <Routes>
                <Route path="/" element={<Navigate to="/home" replace />} />
                <Route path="/home" element={<Home />} />
                <Route path="/cotizador" element={<Cotizador />} />
                <Route path="/consultaot" element={<GestionOT />} />
                <Route path="/clientes" element={<BuscarClientes />} />
                <Route path="/envios" element={<Envios />} />
                <Route path="/compras" element={<Orden_compra />} />
                <Route path="/productos" element={<Productos_editor />} />
                <Route path="/empleados" element={<Empleados />} />
                <Route path="/permisos" element={<Permisos />} />
                <Route path="/caja" element={<CorteCaja />} />
                <Route path="/cajacorteporfecha" element={<CorteCajaPorFecha />} />
                <Route path="/consultagastos" element={<ConsultaGastos />} />
                <Route path="/contardinero" element={<ContarDinero />} />
                <Route path="/cortedia" element={<CorteDia />} />
                <Route path="/modificarcaja" element={<ModificarCaja />} />
                <Route path="/gastos" element={<Gastos />} />
                <Route path="/modificarpago" element={<ModificarPago />} />
                <Route path="/mostrarcaja" element={<MostrarCaja />} />
                <Route path="/lefor" element={<Lefor />} />
                <Route path="/gestionproduccion" element={<GestionProduccion />} />
                <Route path="/invalmacen" element={<InvAlmacen />} />
                <Route path="/comisiones" element={<Comisiones />} />
                <Route path="/comisionesmostrador" element={<ComisionesMostrador />} />
                <Route path="/proveedores" element={<Proveedores />} />
                <Route path="/pago_banda" element={<PagosBanda />} />
                <Route path="/visor_pedidos_especiales" element={<VisorPedidosEspeciales />} />
                <Route path="/tienda_productos" element={<Tienda />} />
                <Route path="/perfil" element={<Perfil />} />
            </Routes>
        </div>
    );
}

export default function App() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (usuario) => {
            setUser(usuario);
            setLoading(false);
        });

        return () => unsub();
    }, []);

    if (loading) {
        return <div style={{ padding: 20 }}>Cargando...</div>;
    }

    if (!user) {
        return <Login />;
    }

    return <AppLayout />;
}
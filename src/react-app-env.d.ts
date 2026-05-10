//Esto es para que acepten los archivos CSS como módulos en TypeScript, lo que permite importar estilos directamente en los componentes de React sin errores de tipo.
declare module "*.css" {
  const content: { [className: string]: string };
  export default content;
}
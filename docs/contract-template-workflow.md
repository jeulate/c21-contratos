# Flujo de contratos con plantillas y perfiles

## Objetivo

Permitir que un asesor registre los datos del propietario y del inmueble, los revise dentro de una vista previa de la plantilla contractual y guarde el contrato con los datos del asesor tomados de su perfil.

El texto contractual debe conservarse como una versión aprobada. El asesor completa datos variables y no puede editar cláusulas. El equipo legal puede preparar y activar nuevas versiones de la plantilla.

## Hallazgos de los cuatro modelos recibidos

Los tres modelos urbanos (venta, alquiler y anticrético) comparten la ficha de propietarios, asesor, oficina y características del inmueble. Rural requiere campos de propiedad y condiciones propias, por lo que se modelará como una variante independiente.

Los documentos separan cuatro tipos de información:

1. **Datos del propietario:** nombre, cédula, lugar de expedición, domicilio, correo y WhatsApp. El texto admite uno o dos propietarios.
2. **Datos del inmueble urbano:** zona, UV, manzana, lote, matrícula de Derechos Reales, tipo, dirección, superficies, habitaciones, suites, otros datos y gravámenes.
3. **Datos económicos:** precio de venta, canon mensual de alquiler, monto de anticrético o precio rural por hectárea y total. Los modelos urbanos incluyen el monto en USD y su expresión literal; el rural no trae una expresión literal en el ejemplo.
4. **Datos del asesor y de la oficina:** datos del asesor en las cláusulas iniciales, de comunicaciones y firmas; datos de contacto de la oficina.

El formulario del asesor solo debe exponer los datos del propietario y del inmueble que correspondan al contrato. Nombre, cédula, teléfono, domicilio y correo del asesor deben provenir de su perfil. Los datos institucionales deben provenir de la configuración de la oficina. Los términos económicos y de vigencia descritos abajo son hallazgos de los modelos, no valores que deban quedar configurados como reglas inmutables sin aprobación legal.

| Sección del documento | Fuente del dato | Campos previstos |
|---|---|---|
| Propietario 1 y 2 | Formulario del contrato | Nombre legal, cédula, expedición, domicilio, correo y WhatsApp |
| Inmueble | Formulario del contrato | Zona, UV, manzana, lote, matrícula, tipo, dirección, superficie de terreno/construida, habitaciones, suites, otros y gravámenes |
| Precio de referencia | Formulario del contrato | Monto en USD y expresión literal |
| Asesor | Perfil del usuario autenticado | Nombre legal, cédula, lugar de expedición, domicilio, móvil, correo y WhatsApp |
| Oficina | Configuración institucional gestionada por administración/legal | Nombre, correo, WhatsApp y datos de representación autorizados |
| Firma y celebración | Fecha validada al generar | Lugar y fecha; el año fijo del modelo requiere aprobación legal |

### Campos por modelo

| Modelo | Campos específicos observados |
|---|---|
| Exclusividad de venta | Ficha urbana compartida; precio referencial de venta en USD y literal. El modelo usa comisión de 4%, vigencia de 4 meses ampliable 90 días, operación directa al 2%, y un periodo posterior de 90 días para clientes presentados. |
| Exclusividad de alquiler | Ficha urbana compartida; canon de arrendamiento en USD y literal. El modelo asigna al arrendatario el pago equivalente a un canon; si el propietario concreta por cuenta propia durante la exclusividad, se menciona 50% del canon. Vigencia de 4 meses ampliable 90 días y periodo posterior para clientes presentados. |
| Exclusividad de anticrético | Ficha urbana compartida; monto referencial de anticrético en USD y literal. El modelo asigna al anticresista el pago de 4%; para operación directa del propietario menciona 2%. Vigencia de 4 meses ampliable 90 días y periodo posterior para clientes presentados. |
| Exclusividad rural | Nombre de la propiedad, clase, actividad, departamento, provincia, municipio, superficie total en hectáreas, título ejecutorial, plano catastral, matrícula, certificado catastral, precio por hectárea y total. El texto menciona negociación con copropietario, pero no define una ficha de copropietario. El modelo establece 2.5% para comprador y vendedor, vigencia de 9 meses ampliable 90 días y periodo posterior de 3 meses. Documentación: título ejecutorial, plano de uso de suelo, impuestos, certificado alodial actualizado, cédulas y POP si aplica. |

Los plazos, comisiones, pagadores, periodos posteriores, cantidad de ejemplares y documentos solicitados son distintos entre modelos y se mantienen dentro de cada texto aprobado; no se deducen de la comisión genérica existente en el sistema. En particular, el rural usa un solo propietario en su ejemplo, incluye el nombre/datos de un asesor precargados y una fecha fija de enero de 2023. Estos valores son datos de muestra que deben sustituirse con marcadores revisados por legal antes de activar esa plantilla.

Las cláusulas de honorarios, exclusividad, vigencia, responsabilidades, documentación, jurisdicción y controversias son texto legal, no campos del asesor. Los tres modelos urbanos incluyen una fecha con el año fijo 2023; el rural contiene fecha fija 03 de enero de 2023. Legal debe decidir si se sustituye por lugar y fecha de emisión al aprobar cada versión digital. El modelo rural no incluye el apartado de comunicaciones que sí aparece en los tres urbanos.

### Decisiones para legal antes de activar las plantillas

- Confirmar la vigencia textual de cada cláusula, comisión, responsable de pago y periodo posterior, porque los cuatro modelos no coinciden.
- Revisar fechas fijas de 2023, datos personales de ejemplo, identidad/representación institucional y el tratamiento de uno o varios propietarios.
- Confirmar cómo registrar copropietarios rurales y si el modelo requiere datos adicionales para ellos.
- Confirmar si se conservarán ubicación, fecha y número de ejemplares de cada modelo como texto aprobado o como marcadores.
- Revisar y corregir errores tipográficos del original dentro de una nueva versión legal; el sistema no debe corregir o reinterpretar el documento por sí solo.

## Perfiles de asesor

Cada usuario con rol `asesor` debe tener un perfil persistido, vinculado por `username`, con los campos que el modelo reutiliza:

- Nombre legal completo.
- Número de cédula y lugar de expedición.
- Domicilio.
- Teléfono móvil y WhatsApp.
- Correo electrónico.
- Estado de revisión/completitud del perfil.

El perfil se carga una vez y se reutiliza en cada contrato. Al guardar un contrato, se guarda una copia de los datos del perfil usados en esa versión del documento; así, una actualización posterior del perfil no cambia contratos ya creados. Antes de permitir generar un contrato, se valida que el perfil exista.

## Permisos propuestos

| Rol | Alcance relacionado con esta integración |
|---|---|
| `asesor` | Mantener su perfil y crear/editar sus contratos; completar solo datos variables de propietario e inmueble; ver y descargar la vista previa Word de los contratos nuevos con plantilla. |
| `legal` | Revisar contratos, versionar y activar plantillas; cambiar estados con observación registrada. No administra contraseñas ni usuarios. |
| `admin` | Crear usuarios y asignar roles; gestionar plantillas y cambios de estado, además de sus permisos administrativos existentes. |
| `administrativo` | Mantiene sus permisos existentes; no modifica plantillas ni cláusulas. |

## Plantillas y control legal

- Implementado: cada tipo contractual mantiene versiones de plantilla con estado (`borrador`, `activa`, `archivada`), fecha de carga/activación y usuario que cargó/aprobó.
- Legal o Admin carga el archivo Word, lo descarga para revisión y activa la versión aprobada. La aplicación valida el DOCX, detecta sus marcadores y rechaza los que no estén soportados.
- Los marcadores usan nombres de datos, no dependen de subrayados. Ejemplos válidos: `{{owner1.fullName}}`, `{{property.registry}}`, `{{advisor.fullName}}`, `{{contract.amount}}` y `{{extras.propertyZone}}`. Los campos `extras.*` disponibles dependen del modelo seleccionado. Para ocultar el bloque del segundo propietario cuando no se informa, se admite `{{#owner2.fullName}}...{{/owner2.fullName}}`.
- Al activar una versión, los contratos nuevos de ese modelo guardan su identificador. El documento se genera desde esa versión, por lo que reactivar otra versión no altera contratos existentes. El perfil del asesor se conserva como snapshot.
- La vista previa Word aparece en el detalle del contrato y permite descargar el `.docx` generado. El asesor no puede editar las cláusulas desde la aplicación; Legal prepara otra versión del archivo y la carga como borrador.
- La activación conserva usuario, fecha y estado de cada versión. Los cambios de estado de contratos guardan usuario, fecha, transición y motivo en el historial.

## Flujo propuesto

1. Administración crea el usuario asesor. El asesor completa su perfil en **Perfil**.
2. Legal convierte una copia del modelo aprobado en `.docx` rellenable usando los marcadores disponibles, la carga desde **Plantillas legales** y descarga la versión para revisarla.
3. Legal activa la versión aprobada. Sin una plantilla activa de ese modelo, la aplicación no permite crear contratos de exclusividad de ese tipo.
4. El asesor inicia el contrato y completa los datos de propietario e inmueble. La aplicación completa los datos del asesor desde su perfil.
5. Al guardar, el asesor ve la vista previa Word y puede descargar el documento. La aplicación conserva el ID de versión y el snapshot del perfil.
6. Legal revisa el contrato y utiliza el panel **Revisión legal** para cambiar su estado, indicando un motivo. Para cambiar cláusulas, carga y activa una versión de plantilla nueva; los contratos existentes conservan la versión previa.

## Límites de la primera entrega

- Los cuatro documentos están recibidos y permiten definir el catálogo de campos y las diferencias de cada modelo.
- La aplicación ya ofrece carga/versionado, generación Word, vista previa, descarga y cambios de estado. La integración de cada contrato real aún requiere que Legal prepare y valide el `.docx` con marcadores; los documentos fuente no se alteran ni se activan automáticamente.
- No se cambian porcentajes, plazos, texto legal, nombres institucionales ni lugar/fecha por defecto sin aprobación del área legal.
- El archivo adjunto incluye datos personales e identificadores. No debe incorporarse al repositorio público. Las plantillas deben cargarse en almacenamiento privado de la aplicación; el repositorio contiene solo código y documentación técnica.

## Implementación actual y siguientes etapas

1. Implementado: roles/perfiles, esquemas de captura para los cuatro modelos, versionado privado de DOCX, vista previa/descarga, snapshots del asesor y control de estado por Legal/Admin.
2. Siguiente: Legal prepara las cuatro copias `.docx` con marcadores, las carga como borradores y verifica que cada marcador corresponda al texto del modelo.
3. Activar cada versión aprobada y probar localmente con perfiles y datos ficticios antes de integrar a `develop`.
4. Ampliación posterior: permitir anotaciones por cláusula, edición legal en la aplicación y configuración de datos institucionales desde una pantalla administrativa.

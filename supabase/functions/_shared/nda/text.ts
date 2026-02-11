export const NDA_VERSION = 'v1';

export const NDA_TEMPLATES = [
  {
    id: 'nda',
    version: 'v1',
    title: 'Acuerdo de Confidencialidad (NDA)',
    content: `ACUERDO DE CONFIDENCIALIDAD (NDA)

Al aceptar este acuerdo, la persona firmante (“Receptor”) reconoce y acepta que:

1. Información Confidencial
Se considera Información Confidencial toda información, documento o contenido
al que el Receptor acceda en el marco del flujo de firma, incluyendo pero no
limitado a documentos, datos, metadatos y evidencias.

2. Obligación de Confidencialidad
El Receptor se compromete a no divulgar, compartir ni utilizar la Información
Confidencial para fines distintos a la finalidad del acto de firma, salvo
autorización expresa del titular o requerimiento legal válido.

3. Alcance
Este acuerdo aplica desde el momento de su aceptación y se mantiene vigente
independientemente de que el proceso de firma se complete o no.

4. Exclusiones
No se considerará Información Confidencial aquella que:
a) Sea de dominio público sin violación de este acuerdo.
b) Haya sido obtenida legítimamente por el Receptor con anterioridad.
c) Deba divulgarse por mandato legal o judicial.

5. Aceptación
La aceptación de este acuerdo queda registrada de forma verificable como un
evento independiente del documento firmado.`,
  },
  {
    id: 'msa',
    version: 'v1',
    title: 'Acuerdo Marco de Servicios (MSA)',
    content: `ACUERDO MARCO DE SERVICIOS (MSA)

Este acuerdo establece los términos generales bajo los cuales las partes podrán
colaborar en la prestación de servicios profesionales, creativos o técnicos.

1. Naturaleza del acuerdo
Este documento define un marco general y no obliga a la ejecución de servicios
específicos, los cuales deberán acordarse por separado.

2. Confidencialidad
Toda información intercambiada se considerará confidencial y estará sujeta a un
acuerdo de confidencialidad aplicable.

3. Propiedad intelectual
Salvo acuerdo en contrario, cada parte conserva la titularidad de sus activos
preexistentes.

4. Limitación
Este acuerdo no constituye una orden de trabajo ni genera obligaciones económicas
hasta que exista un acuerdo específico adicional.

5. Registro
La aceptación de este acuerdo queda registrada de forma verificable.`,
  },
  {
    id: 'sow',
    version: 'v1',
    title: 'Declaración de Trabajo (SOW)',
    content: `DECLARACIÓN DE TRABAJO (SOW)

Este documento describe el alcance general de una colaboración específica entre
las partes.

1. Objeto
Definir el tipo de trabajo, colaboración o actividad a realizar, sin perjuicio
de ajustes posteriores acordados por las partes.

2. Alcance general
El trabajo podrá incluir actividades creativas, técnicas, analíticas o de soporte,
según lo acordado.

3. Entregables
Los entregables serán definidos de forma flexible y podrán evolucionar durante
la ejecución.

4. Confidencialidad
Toda información intercambiada se considera confidencial.

5. Naturaleza
Este documento no sustituye contratos formales ni establece pagos salvo acuerdo
expreso posterior.

6. Registro
La aceptación de este documento queda registrada de forma verificable.`,
  },
  {
    id: 'loi',
    version: 'v1',
    title: 'Carta de Intención (LOI)',
    content: `CARTA DE INTENCIÓN (LOI)

Este documento expresa la intención de las partes de explorar una posible
colaboración futura.

1. Intención
La aceptación de esta carta no constituye una obligación contractual vinculante,
sino una manifestación de interés.

2. Confidencialidad
La información intercambiada en el marco de esta exploración se considera
confidencial.

3. No exclusividad
Salvo indicación expresa, esta carta no implica exclusividad entre las partes.

4. Vigencia
La presente intención se mantiene vigente por un período razonable desde su
aceptación.

5. Registro
La aceptación de esta carta queda registrada de forma verificable.`,
  },
  {
    id: 'campaign-nda',
    version: 'v1',
    title: 'Confidencialidad de Campaña',
    content: `ACUERDO DE CONFIDENCIALIDAD DE CAMPAÑA

Este acuerdo aplica exclusivamente a la información relacionada con una campaña,
lanzamiento o iniciativa específica.

1. Alcance
La Información Confidencial incluye materiales creativos, estrategias, mensajes,
fechas, métricas, resultados y cualquier información asociada a la campaña.

2. Uso permitido
La información solo podrá utilizarse para evaluar, ejecutar o colaborar en la
campaña acordada.

3. Vigencia
La obligación de confidencialidad se mantiene incluso después de finalizada la
campaña.

4. Exclusiones
Se aplican las exclusiones habituales de información pública o requerida por ley.

5. Registro
La aceptación de este acuerdo queda registrada de forma verificable.`,
  },
] as const;

export const NDA_V1_TEXT = NDA_TEMPLATES[0].content;

export type NdaTemplateMeta = {
  nda_source: 'template' | 'user';
  template_id: string | null;
  template_version: string | null;
};

export const normalizeNdaText = (text: string): string =>
  text.replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '').trim();

export const resolveNdaTemplateMetadata = (ndaText: string | null | undefined): NdaTemplateMeta => {
  if (!ndaText) {
    return { nda_source: 'user', template_id: null, template_version: null };
  }

  const normalized = normalizeNdaText(ndaText);
  for (const template of NDA_TEMPLATES) {
    if (normalized === normalizeNdaText(template.content)) {
      return {
        nda_source: 'template',
        template_id: template.id,
        template_version: template.version
      };
    }
  }

  return { nda_source: 'user', template_id: null, template_version: null };
};

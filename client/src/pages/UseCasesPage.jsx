import React from 'react';
import HeaderPublic from '../components/HeaderPublic';
import FooterPublic from '../components/FooterPublic';
import PageTitle from '../components/PageTitle';
import Briefcase from 'lucide-react/dist/esm/icons/briefcase';
import FlaskConical from 'lucide-react/dist/esm/icons/flask-conical';
import Palette from 'lucide-react/dist/esm/icons/palette';
import Building2 from 'lucide-react/dist/esm/icons/building2';

export default function UseCasesPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <HeaderPublic />
      
      <main className="flex-grow pt-16">
        <div className="max-w-3xl mx-auto px-4 pb-24">
          <PageTitle subtitle="Descubrí cómo EcoSign transforma la manera de trabajar en distintas industrias.">
            Casos de Uso
          </PageTitle>

          {/* Casos */}
          <div className="space-y-12 mt-8">
            {/* 1. Equipos Legales */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <Briefcase className="w-6 h-6 text-[#0A66C2]" />
                <h2 className="text-2xl font-bold text-black">Equipos Legales, RRHH y Compliance</h2>
              </div>
              <p className="text-base text-gray-600 mb-6">
                Para quienes necesitan orden, trazabilidad y cero riesgo operativo.
              </p>

              <div className="space-y-6">
                <div className="border-l-4 border-[#0A66C2] pl-4">
                  <h3 className="text-xl font-bold text-black mb-2">Caso real: NDA con proveedores externos</h3>
                  <p className="text-base text-gray-700 mb-2">
                    Un estudio jurídico comparte un NDA con un proveedor. El proveedor firma desde su mail sin crear cuenta. EcoSign registra:
                  </p>
                  <ul className="space-y-2 text-gray-700 ml-6 mb-4">
                    <li className="flex items-start gap-2"><span className="text-[#0A66C2]">•</span> hash original del documento</li>
                    <li className="flex items-start gap-2"><span className="text-[#0A66C2]">•</span> fecha/hora exacta</li>
                    <li className="flex items-start gap-2"><span className="text-[#0A66C2]">•</span> IP del firmante</li>
                    <li className="flex items-start gap-2"><span className="text-[#0A66C2]">•</span> evento de firma</li>
                    <li className="flex items-start gap-2"><span className="text-[#0A66C2]">•</span> timestamp legal y blockchain</li>
                    <li className="flex items-start gap-2"><span className="text-[#0A66C2]">•</span> .ECO con la auditoría completa</li>
                  </ul>
                  <p className="text-gray-700 font-semibold">
                    Resultado: El estudio puede demostrar fecha cierta y no repudio incluso si el proveedor luego niega haber firmado.
                  </p>
                </div>

                <div className="border-l-4 border-[#0A66C2] pl-6">
                  <h3 className="text-xl font-bold text-black mb-3">Caso real: Aprobaciones internas de RRHH</h3>
                  <p className="text-gray-700 mb-3">
                    Una empresa necesita que un gerente apruebe: contratación, aumento salarial, proceso disciplinario, cambios de política interna.
                  </p>
                  <p className="text-gray-700 mb-3">
                    Antes lo hacían por mail (riesgo total). Ahora suben un PDF interno a EcoSign, lo firman, queda auditado y verificado.
                  </p>
                  <p className="text-gray-700 font-semibold">
                    Resultado: Cumple ISO/IEC 27037 (trazabilidad de evidencia digital) sin infraestructura costosa.
                  </p>
                </div>

                <div className="border-l-4 border-[#0A66C2] pl-6">
                  <h3 className="text-xl font-bold text-black mb-3">Caso real: Compliance exige trazabilidad</h3>
                  <p className="text-gray-700 mb-3">
                    Un departamento de Compliance debe probar que un proceso fue aprobado antes de ejecutarse. En EcoSign, la aprobación queda con: hash, timestamp legal, blockchain, ChainLog inmutable.
                  </p>
                  <p className="text-gray-700 font-semibold">
                    Resultado: Cualquier auditor externo puede validar sin pedir acceso al sistema interno.
                  </p>
                </div>
              </div>
            </section>

            {/* 2. Laboratorios */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <FlaskConical className="w-8 h-8 text-[#0A66C2]" />
                <h2 className="text-3xl font-bold text-black">Laboratorios y Científicos</h2>
              </div>
              <p className="text-lg text-gray-600 mb-8">
                Para quienes necesitan demostrar integridad del dato fuente.
              </p>

              <div className="space-y-8">
                <div className="border-l-4 border-[#0A66C2] pl-6">
                  <h3 className="text-xl font-bold text-black mb-3">Caso real: Resultados de laboratorio antes de publicación</h3>
                  <p className="text-gray-700 mb-3">
                    Un científico obtiene una tabla de resultados preliminar. Necesita demostrar que esos datos existían en esa fecha sin compartirlos. Sube el archivo, genera el .ECO y guarda ambos.
                  </p>
                  <p className="text-gray-700 font-semibold">
                    Resultado: Si otro investigador intenta disputarle autoría o cronología, el .ECO lo protege.
                  </p>
                </div>

                <div className="border-l-4 border-[#0A66C2] pl-6">
                  <h3 className="text-xl font-bold text-black mb-3">Caso real: Buenas prácticas científicas (GLP)</h3>
                  <p className="text-gray-700 mb-3">
                    Un laboratorio registra cada actualización en los documentos de validación. En vez de mantener logs manuales, usan EcoSign para sellar cada versión.
                  </p>
                  <p className="text-gray-700 font-semibold">
                    Resultado: Pistas de auditoría reproducibles sin subir datos sensibles a la nube.
                  </p>
                </div>

                <div className="border-l-4 border-[#0A66C2] pl-6">
                  <h3 className="text-xl font-bold text-black mb-3">Caso real: Reproducibilidad inter-institucional</h3>
                  <p className="text-gray-700 mb-3">
                    Dos laboratorios colaboran. Comparten resultados sellados solo con hashes y .ECO, sin revelar datos completos.
                  </p>
                  <p className="text-gray-700 font-semibold">
                    Resultado: Evitan filtraciones y cumplen normas de integridad científica.
                  </p>
                </div>
              </div>
            </section>

            {/* 3. Creadores */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <Palette className="w-8 h-8 text-[#0A66C2]" />
                <h2 className="text-3xl font-bold text-black">Creadores y Desarrolladores</h2>
              </div>
              <p className="text-lg text-gray-600 mb-8">
                Para quienes necesitan demostrar autoría sin revelar contenido.
              </p>

              <div className="space-y-8">
                <div className="border-l-4 border-[#0A66C2] pl-6">
                  <h3 className="text-xl font-bold text-black mb-3">Caso real: Escritor protege su manuscrito</h3>
                  <p className="text-gray-700 mb-3">
                    Una escritora certifica el primer borrador de una novela. Meses después, un editor cuestiona quién escribió qué primero.
                  </p>
                  <p className="text-gray-700 font-semibold">
                    Resultado: La escritora muestra el .ECO firmado en la fecha original: caso cerrado.
                  </p>
                </div>

                <div className="border-l-4 border-[#0A66C2] pl-6">
                  <h3 className="text-xl font-bold text-black mb-3">Caso real: Diseñador protege un logo o identidad visual</h3>
                  <p className="text-gray-700 mb-3">
                    Sube el archivo .AI o .PNG. Genera el .ECO con hash y timestamp.
                  </p>
                  <p className="text-gray-700 font-semibold">
                    Resultado: Puede demostrar prioridad sin registrar nada formalmente (sirve para juicios o disputas).
                  </p>
                </div>

                <div className="border-l-4 border-[#0A66C2] pl-6">
                  <h3 className="text-xl font-bold text-black mb-3">Caso real: Desarrollador prueba existencia de su código</h3>
                  <p className="text-gray-700 mb-3">
                    Antes de presentar un pitch, el equipo certifica: repositorio ZIP, commits clave, documentación interna.
                  </p>
                  <p className="text-gray-700 font-semibold">
                    Resultado: Si un inversor o partner se "inspira demasiado", EcoSign prueba autoría inmediata.
                  </p>
                </div>
              </div>
            </section>

            {/* 4. Enterprise */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <Building2 className="w-8 h-8 text-[#0A66C2]" />
                <h2 className="text-3xl font-bold text-black">Empresas y Tecnología (Enterprise)</h2>
              </div>
              <p className="text-lg text-gray-600 mb-8">
                Para quienes necesitan estandarizar procesos y reducir costos.
              </p>

              <div className="space-y-8">
                <div className="border-l-4 border-[#0A66C2] pl-6">
                  <h3 className="text-xl font-bold text-black mb-3">Caso real: Proceso de compras y proveedores</h3>
                  <p className="text-gray-700 mb-3">
                    Una empresa registra todas las órdenes de compra internas con EcoSign. Cada aprobación tiene trazabilidad completa.
                  </p>
                  <p className="text-gray-700 font-semibold">
                    Resultado: Evitan fraudes internos, manipulación de PDFs y pruebas débiles en auditorías.
                  </p>
                </div>

                <div className="border-l-4 border-[#0A66C2] pl-6">
                  <h3 className="text-xl font-bold text-black mb-3">Caso real: Integración vía API</h3>
                  <p className="text-gray-700 mb-3">
                    Una fintech integra EcoSign para sellar logs, contratos de cliente y políticas de riesgo.
                  </p>
                  <p className="text-gray-700 font-semibold">
                    Resultado: Blindaje forense sin tocar su infraestructura ni almacenar PDFs.
                  </p>
                </div>

                <div className="border-l-4 border-[#0A66C2] pl-6">
                  <h3 className="text-xl font-bold text-black mb-3">Caso real: Validación legal en disputas con clientes</h3>
                  <p className="text-gray-700 mb-3">
                    Un usuario niega haber aceptado un documento. La empresa presenta el .ECO + timestamp legal + blockchain.
                  </p>
                  <p className="text-gray-700 font-semibold">
                    Resultado: Prueba perfecta, verificable por cualquier juez o perito.
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* CTA */}
          <div className="text-center mt-16 pt-8 border-t border-gray-200">
            <p className="text-lg text-gray-700 mb-6">
              ¿Querés ver cómo EcoSign puede ayudar a tu equipo?
            </p>
            <a
              href="/login"
              className="inline-block bg-black text-white px-8 py-4 rounded-lg font-semibold hover:bg-gray-800 transition"
            >
              Comenzar Gratis
            </a>
          </div>
        </div>
      </main>

      <FooterPublic />
    </div>
  );
}

import HeaderPublic from '../components/HeaderPublic';
import FooterPublic from '../components/FooterPublic';
import PageTitle from '../components/PageTitle';

const ContactPage = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <HeaderPublic />

      {/* Content */}
      <main className="flex-grow pt-24">
        <div className="max-w-3xl mx-auto px-4 pb-24">
          <PageTitle subtitle="Podés comunicarte con nosotros por email:">
            Contacto
          </PageTitle>

          <div className="space-y-6 text-base text-gray-700 leading-relaxed mt-8">

            <div className="bg-gray-100 rounded-xl p-8 max-w-2xl mx-auto">
              <a
                href="mailto:soporte@ecosign.app"
                className="text-2xl font-semibold text-black hover:underline"
              >
                📧 soporte@ecosign.app
              </a>
            </div>

            <p className="text-gray-600">
              Próximamente habilitaremos un formulario de contacto.
            </p>
          </div>


        </div>
      </main>

      <FooterPublic />
    </div>
  );
};

export default ContactPage;

describe('Login Page', () => {
  it('should display the login form', () => {
    cy.visit('/login');
    cy.contains('Iniciar Sesión').should('be.visible');
    cy.get('input[name="email"]').should('be.visible');
    cy.get('input[name="password"]').should('be.visible');
    cy.get('button[type="submit"]').contains('Iniciar Sesión').should('be.visible');
  });

  it('should navigate to the guest page', () => {
    cy.visit('/login');
    cy.contains('Continuar como invitado').click();
    cy.url().should('include', '/guest');
  });
});

let mockVersion = '1.0.0';

module.exports = {
  get expoConfig() {
    return {
      name: 'Pilates Espaço Mulher',
      slug: 'pilates-espaco-mulher',
      version: mockVersion,
      extra: {
        clinician: {
          name: 'Dra. Rogéria Collares',
          crefito: 'CREFITO 23093-F',
          clinic: 'Pilates Espaço Mulher',
          location: 'Costa Azul, Rio das Ostras - RJ',
          phone: '(22) 99947-4304',
        },
      },
    };
  },
  __setVersion: (v) => {
    mockVersion = v;
  },
  __reset: () => {
    mockVersion = '1.0.0';
  },
};

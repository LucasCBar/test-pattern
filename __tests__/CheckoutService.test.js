import { CheckoutService } from '../src/services/CheckoutService.js';
import { UserMother } from './builders/UserMother.js';
import { CarrinhoBuilder } from './builders/CarrinhoBuilder.js';
import { Item } from '../src/domain/Item.js';
import { Pedido } from '../src/domain/Pedido.js';

const repositoryDummy = { salvar: jest.fn() };
const emailDummy = { enviarEmail: jest.fn() };
const gatewayDummy = { cobrar: jest.fn() };

const cartaoQualquer = { numero: '1234-5678-9012-3456' };


describe('CheckoutService', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('quando o pagamento falha', () => {
    it('deve retornar null sem salvar pedido ou enviar e-mail', async () => {
      const carrinho = new CarrinhoBuilder().build();

      const gatewayStub = {
        cobrar: jest.fn().mockResolvedValue({ success: false }),
      };

      const repositoryDummy = { salvar: jest.fn() };
      const emailDummy     = { enviarEmail: jest.fn() };

      const service = new CheckoutService(gatewayStub, repositoryDummy, emailDummy);

      const pedido = await service.processarPedido(carrinho, cartaoQualquer);

      expect(pedido).toBeNull();
      expect(repositoryDummy.salvar).not.toHaveBeenCalled();
      expect(emailDummy.enviarEmail).not.toHaveBeenCalled();
    });
  });

  describe('quando um cliente Premium finaliza a compra', () => {
    it('deve cobrar com desconto de 10% e enviar e-mail de confirmação', async () => {
      const usuarioPremium = UserMother.umUsuarioPremium();

      const carrinho = new CarrinhoBuilder()
        .comUser(usuarioPremium)
        .comItens([
          new Item('Notebook', 120),
          new Item('Mouse', 80),
        ])
        .build();

      const pedidoSalvoFake = new Pedido(42, carrinho, 180, 'PROCESSADO');


      const gatewayStub = {
        cobrar: jest.fn().mockResolvedValue({ success: true }),
      };

      const repositoryStub = {
        salvar: jest.fn().mockResolvedValue(pedidoSalvoFake),
      };

      const emailMock = {
        enviarEmail: jest.fn().mockResolvedValue(undefined),
      };

      const service = new CheckoutService(gatewayStub, repositoryStub, emailMock);

      const resultado = await service.processarPedido(carrinho, cartaoQualquer);

      expect(gatewayStub.cobrar).toHaveBeenCalledWith(180, cartaoQualquer);

      expect(emailMock.enviarEmail).toHaveBeenCalledTimes(1);
      expect(emailMock.enviarEmail).toHaveBeenCalledWith(
        'premium@email.com',
        'Seu Pedido foi Aprovado!',
        expect.stringContaining('42')
      );

      expect(resultado).toBe(pedidoSalvoFake);
      expect(resultado.totalFinal).toBe(180);
    });
  });

});

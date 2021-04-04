import { expect } from 'chai';
import { SinonSandbox, createSandbox } from 'sinon';

import { none, Some } from '../../src/maybe';
import { Lazy } from '../../src/lazy';
import { Generator } from '../../src';
import { Generators } from '../../src';

describe('core generators', () => {

  let sandbox: SinonSandbox;

  beforeEach(() => {
    sandbox = createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('never', () => {

    it('should always produce empty value', () => {
      let generator: Generator<number> = Generators.never();

      expect(generator.generate()).to.eql(none);
    });
  });

  describe('pure', () => {

    it('should produce the value given as the argument', () => {
      let value = 5;

      expect(Generators.pure(value).generate()).to.eql(new Some(value));
    });
  });

  describe('oneOfValues', () => {

    it('should generate one of the values', () => {
      let values = [1, 2, 3];
      let generatedValue = Generators.oneOfValues(...values).generate();
      expect(values.includes(generatedValue.get())).to.be.true;
    });

    it('should generate none when the list of values is empty', () => {
      expect(Generators.oneOfValues().generate()).to.eql(none);
    });
  });

  describe('oneOf', () => {

    it('should generate one of the values', () => {
      let first = Generators.choose(0, 10);
      let second = Generators.choose(10, 20);
      let third = Generators.choose(20, 30);
      let generatedValue = Generators.oneOf(first, second, third).generate().get();
      expect(generatedValue).within(0, 30);
    });

    it('should generate none when the list of values is empty', () => {
      expect(Generators.oneOf().generate()).to.eql(none);
    });
  });

  describe('sequenceOfValues', () => {

    it('should generate the given values in sequence', () => {
      const values = [0, 1, 2];
      const generator = Generators.sequenceOfValues(...values);
      const numberOfSequences = 3;
      const times = values.length * numberOfSequences;

      const expected = [].concat.apply([], [...Array(numberOfSequences)].map(_ => values));
      const generated = [...Array(times)].map(_ =>
        generator.generate().get()
      );
      expect(generated).to.eql(expected);
    });

    it('should generate only single value if a single value is given', () => {
      const value = 3;
      const times = 5;
      const expected = [...Array(times)].map(_ => value);
      const generator = Generators.sequenceOfValues(value);

      const generated = [...Array(times)].map(_ =>
        generator.generate().get()
      );
      expect(generated).to.eql(expected);
    });


    it('should generate none if no values are given', () => {
      expect(Generators.sequenceOfValues().generate()).to.eql(none);
    });
  });

  describe('sequenceOf', () => {

    it('should generate sequence of values generated by the generators', () => {
      const generators = [Generators.pure(1), Generators.never(), Generators.pure(2)];
      const sequenceGenerator = Generators.sequenceOf(...generators);

      const generated = generators.map(_ => sequenceGenerator.generate());

      expect(generated).to.eql([new Some(1), none, new Some(2)]);
    });

    it('should generate a single value if only one generator is provided', () => {
      const value = 3;
      const generator = Generators.sequenceOf(Generators.pure(value));
      expect(generator.generate().get()).to.eql(value);
    });

    it('should generate none if no generators are provided', () => {
      const generator = Generators.sequenceOf();
      expect(generator.generate()).to.eql(none);
    });
  });

  describe('frequency', () => {

    it('should choose one of two generators based on frequency which is different', () => {
      const firstValueFrequency = 0.1
      const firstValue = 1
      const secondValueFrequency = 0.9
      const secondValue = 2
      const smallDelta = Math.min(firstValueFrequency, secondValueFrequency) / 2;
      const generator = Generators.frequency([firstValueFrequency, Generators.pure(1)], [secondValueFrequency, Generators.pure(2)]);

      const stub = sandbox.stub(Math, 'random');
      stub.returns(firstValueFrequency - smallDelta);
      expect(generator.generate().get()).to.eql(firstValue);
      stub.returns(firstValueFrequency + smallDelta);
      expect(generator.generate().get()).to.eql(secondValue);
    });

    it('should support multiple generators and frequencies which do not add up to one', () => {
      const generatorsNumber = 5;
      const generatorFrequency = 3;
      const generators: Array<[number, Generator<number>]> = [...Array(generatorsNumber).keys()].map(idx =>
        [generatorFrequency, Generators.pure(idx)]
      );

      const generator = Generators.frequency(...generators);
      const lastGeneratorProbability = 1 - (1 / (generatorsNumber + 1));
      sandbox.stub(Math, 'random').returns(lastGeneratorProbability);
      expect(generator.generate().get()).to.eql(generatorsNumber - 1);
    });

    it('should result in the provided generator if only one is given', () => {
      const value = 5;
      expect(Generators.frequency([1, Generators.pure(value)]).generate().get()).to.eql(value);
    });

    it('should generate none if no generators are provided', () => {
      expect(Generators.frequency().generate()).to.eql(none);
    });

    it('should generate none if all generator frequencies are zero', () => {
      const generatorsNumber = 3;
      const generators: Array<[number, Generator<number>]> = [...Array(generatorsNumber).keys()].map(idx =>
        [0, Generators.pure(idx)]
      );

      const generator = Generators.frequency(...generators);
      sandbox.stub(Math, 'random').returns(0.5);
      expect(generator.generate()).to.eql(none);
    });

    it('should interpret negative frequencies as zero', () => {
      const generator = Generators.frequency([0, Generators.pure(1)], [0.2, Generators.pure(2)]);

      expect(generator.generate().get()).to.eql(2);
    });
  });

  describe('frequencyOfValues', () => {

    it('should generate given values with the provided frequencies', () => {
      const generator = Generators.frequencyOfValues([0.3, 1], [0.3, 2], [0.4, 3]);
      sandbox.stub(Math, 'random').returns(0.5);
      expect(generator.generate().get()).to.eql(2);
    });
  });

  describe('recursive', () => {

    it('should generate value while recursion is not finished', () => {
      let counter = 0;
      const maxCounter = 5;
      const generator = Generators.recursive<string>((recurse: Lazy<Generator<string>>) => {
        counter = counter + 1;
        console.log(`counter = ${counter}`);
        if (counter <= maxCounter) {
          const currentCounterValue = counter;
          return recurse.force().map(_ => _ + currentCounterValue.toString());
        } else {
          return Generators.pure('$');
        }
      });
      expect(generator.generate().get()).to.eql('$54321');
    });
  });
});
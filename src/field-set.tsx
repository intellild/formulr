import { useMemo } from 'react';
import { useFormContext, IFormContext } from './context';
import {
  FieldSetModel,
  BasicModel,
  FormStrategy,
  ModelRef,
  $FieldSetValue,
  isModelRef,
  isFieldSetModel,
} from './models';
import { useValue$ } from './hooks';
import { IValidator } from './validate';
import { removeOnUnmount, orElse, isPlainObject } from './utils';

export type IUseFieldSet<T extends Record<string, BasicModel<any>>> = [IFormContext, FieldSetModel<T>];

function useFieldSetModel<T extends Record<string, BasicModel<any>>>(
  field: string | FieldSetModel<T> | ModelRef<$FieldSetValue<T>, any, FieldSetModel<T>>,
  parent: FieldSetModel,
  strategy: FormStrategy,
) {
  return useMemo(() => {
    let model: FieldSetModel<any>;
    if (typeof field === 'string') {
      if (strategy !== FormStrategy.View) {
        throw new Error();
      }
      const m = parent.get(field);
      if (!m || !isFieldSetModel<T>(m)) {
        model = new FieldSetModel({});
        const v = orElse<Partial<T>>({}, isPlainObject, parent.getPatchedValue(field));
        model.patchedValue = v;
        parent.registerChild(field, model as BasicModel<unknown>);
      } else {
        model = m;
      }
    } else if (isModelRef<$FieldSetValue<T>, any, FieldSetModel<T>>(field)) {
      const m = field.getModel();
      if (!m || !isFieldSetModel<T>(m)) {
        model = new FieldSetModel({});
        const v = orElse<Partial<T>>({}, isPlainObject, field.patchedValue, field.initialValue);
        model.patchedValue = v;
        field.setModel(model);
      } else {
        model = m;
      }
    } else {
      model = field;
    }
    return model;
  }, [field, parent, strategy]);
}

export function useFieldSet<T extends Record<string, BasicModel<any>>>(
  field: string | FieldSetModel<T> | ModelRef<$FieldSetValue<T>, any, FieldSetModel<T>>,
  validators: readonly IValidator<T>[] = [],
): IUseFieldSet<T> {
  const { parent, strategy, form } = useFormContext();
  const model = useFieldSetModel(field, parent, strategy);
  if (typeof field === 'string' || isModelRef(field)) {
    model.validators = validators;
  }
  const childContext = useMemo(
    () => ({
      strategy,
      form,
      parent: model as FieldSetModel,
    }),
    [strategy, form, model],
  );
  /**
   * ignore returned value
   * user can get the value from model
   */
  useValue$(model.error$, model.error$.getValue());
  removeOnUnmount(field, model, parent);
  return [childContext, model];
}

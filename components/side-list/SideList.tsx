import classNames from 'classnames';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import styles from './SideList.module.scss';

export default function SideList({items, onSubmit}: {items: string[], onSubmit: (fe: string[], normalised: boolean) => void}) {
  const { register, getValues, control } = useForm();
  const [disabled, setDisabled] = useState<boolean>();
  const watch = useWatch({control});

  const getCheckedBoxes = () => {
    const values = getValues();
    return Object.keys(getValues()).filter(key => values[key]);
  };

  const handleClick = (normalised: boolean) => {
    onSubmit(getCheckedBoxes(), normalised);
  };

  useEffect(()=> {
    setDisabled(getCheckedBoxes().length < 2);
  }, [watch]);

  return (<>
    {items?.length !== 0 &&
      <div className={
        classNames(
          'd-flex flex-column border',
          styles.container
        )}>
        <span className='mx-auto fw-bold'>Features</span>
        <hr />
        <ul className={
          classNames(styles.ul, 'mb-0')}>
          {items?.map((item, index) => (
            <li className={styles.li} key={index} >
              <div className="form-check">
                <input
                  {...register(item)}
                  className="form-check-input"
                  type="checkbox"
                  id={`Check${index}`}
                />
                <label className="form-check-label" htmlFor={`Check${index}`}>
                  {item}
                </label>
              </div>
            </li>
          ))}
        </ul>
        <button
          className="btn btn-secondary"
          type='button'
          onClick={() => handleClick(false)}
          disabled={disabled}
        >Plot</button>
        <button
          className="btn btn-secondary"
          type='button'
          onClick={() => handleClick(true)}
          disabled={disabled}
        >Normalised plot</button>
      </div>
    }
  </>);
}

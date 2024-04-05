import classNames from 'classnames';
import { useForm } from 'react-hook-form';

import styles from './SideList.module.scss';

export default function SideList({items, onSubmit}: {items: string[], onSubmit: (fe: string[]) => void}) {
  const {register, getValues} = useForm();

  const onClick = () => {
    const values = getValues();
    onSubmit(Object.keys(getValues()).filter(key => values[key]));
  };

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
          {items.map((item, index) => (<>
            <li className={styles.li} key={item}>
              <div className="form-check">
                <input
                  {...register(item)}
                  className="form-check-input"
                  type="checkbox"
                  id={`Check${index }`}
                />
                <label className="form-check-label" htmlFor={`Check${index}`}>
                  {item}
                </label>
              </div>
            </li>
          </>))}
        </ul>
        <button
          className="btn btn-secondary"
          type='button'
          onClick={onClick}
        >Send</button>
      </div>
    }
  </>);
}

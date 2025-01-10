import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

interface SelectFileProps {
  onSubmit: (file: File) => void,
}

export const SelectFile = (props: SelectFileProps) => {
  const { onSubmit } = props;
  const { register, handleSubmit, getValues, control } = useForm();
  const watch = useWatch({control});
  const [disableLoadFile, setDisableLoadFile] = useState(true);

  useEffect(() => {
    const files = getValues('file');
    setDisableLoadFile(!files || files.length === 0);
  }, [watch]);

  const submitFile = () => {
    const value: FileList = getValues('file');
    const file = value.item(0)!;
    onSubmit(file);
  };

  return (
    <form onSubmit={handleSubmit(submitFile)}>
      <div className='m-3'>
        <label htmlFor='file' className='form-label'>Select file</label>
        <input
          {...register('file')}
          type='file'
          className='mb-3 form-control'
          id='file'
        />

        <button className='btn btn-primary' type='submit' disabled={disableLoadFile}>Load file</button>
      </div>
    </form>
  );
};

export default SelectFile;

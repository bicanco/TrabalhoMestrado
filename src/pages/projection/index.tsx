import classNames from 'classnames';
import * as d3 from 'd3';
import Head from 'next/head';
import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import SideList from '@components/side-list/SideList';

import styles from './Projection.module.scss';

export default function Chart() {
  const {register, handleSubmit, getValues, setValue, control} = useForm();
  const watch = useWatch({control});
  const chart = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<{id: number, x: number, y: number, text: string}[]>([]);
  const [tempData, setTempData] = useState<any>({});
  const [numericFeatures, setNumericFeatures] = useState<string[]>([]);
  const [species, setSpecies] = useState<string[]>([]);
  const [selection, setSelection] = useState<any[]>([]);
  const [loadging, setLoading] = useState<boolean>(false);
  const [showSelect, setShowSelect] = useState<boolean>(false);
  const [disableExport, setDisableExport] = useState<boolean>(true);
  const [commentsAdded, setCommentsAdded] = useState<number>(0);
  const [disableLoadFile, setDisableLoadFile] = useState<boolean>(true);
  const [audioSrc, setAudioSrc] = useState<string>();
  const [audioSrcIndex, setAudioSrcIndex] = useState<number>();

  const onSubmit = async () => {
    const value: FileList = getValues('file');
    const file = value.item(0);
    const body = new FormData();
    body.append('files', file!);
    fetch('http://localhost:8000/open',
      {
        method: 'POST',
        body
      })
      .then(resp => resp.json())
      .then(resp => {
        const features = resp.features.filter((item: any) => item.isNumeric).map((item:any) => item.feature)

        setNumericFeatures(features);
        setSpecies(resp.classes);
        setShowSelect(true);
      });

  }

  useEffect(() => {
    if (data?.length) {
      drawChart();
    }
  }, [data]);

  useEffect(() => {
    const files = getValues('file');
    setDisableLoadFile(!files || files.length === 0);
  }, [watch]);

  const getCircleColour = (data: any) => {
    return data.colour || 'steelblue';
  }

  const drawChart = () => {
    const width = 500;
    const height = 500;
    const margin = 20;
    const svg = d3.select(chart.current);
    svg.selectAll('*').remove();

    svg.attr('width', width+2*margin)
      .attr('height', height+2*margin)
      .attr('viewBox', [0, 0, width, height])
      .attr('style', 'width: auto; height: auto;');

    const ymax = d3.max(data, d => d.y)!;
    const ymin = d3.min(data, d => d.y)!;
    const yScale = d3.scaleLinear()
      .domain([ymin, ymax])
      .range([margin, height - margin])

    const xmax = d3.max(data, d => d.x)!;
    const xmin = d3.min(data, d => d.x)!;
    const xScale = d3.scaleLinear()
      .domain([xmin, xmax])
      .range([margin, width - margin])

    const dots = svg.append('g')
      .selectAll()
      .data(data)
      .join('circle')
      .attr('fill', getCircleColour)
      .attr('stroke', getCircleColour)
      .attr('stroke-width', 1.5)
      .attr('id', i => i.id)
      .attr('cx', i => xScale(i.x))
      .attr('cy', i => yScale(i.y))
      .attr('r', 5);

      svg.call(d3.brush().on('start brush end', ({selection}) => {
        let value: any = [];
        if (selection) {
          const [[x0, y0], [x1, y1]] = selection;
          value = dots
            .style('stroke', getCircleColour)
            .filter(d => x0 <= xScale(d.x) && xScale(d.x) < x1
                    && y0 <= yScale(d.y) && yScale(d.y) < y1)
            .style('stroke', 'black')
            .data();
        }

        d3.select('.selected')
          .attr('class', null)
          .attr('fill', getCircleColour)

        setAudioSrcIndex(undefined);
        setAudioSrc('');
        setSelection(value);
      }) as any);

  }

  const getProj = (features: string[], normalised: boolean) => {
    setLoading(true);
    const value: FileList = getValues('file');
    const file = value.item(0);
    const body = new FormData();
    body.append('files', file!);
    const params = new URLSearchParams({
      selectedClass: getValues('species'),
      key: 'filename',
      normalise: normalised.toString()
    })
    features.forEach(feature => params.append('features', feature))
    fetch('http://localhost:8000/projection?' + params,
      {
        method: 'POST',
        body
      })
      .then(resp => resp.json())
      .then(data  => {
        setData(data);
      })
      .finally(() => setLoading(false));
  }

  const sub = (arr: string[], normalised: boolean) => {
    const map: any = [];
    numericFeatures.forEach((item) => {
      if (arr.findIndex((it) => it === item) !== -1) {
        map.push(item)
      }
    });

    d3.select(chart.current)
      .call(d3.brush().clear as any)
    d3.selectAll('circle')
      .style('stroke', getCircleColour)
    setSelection([]);
    getProj(map, normalised);
  }

  const addComment = () => {
    const comment = getValues('comment');
    setTempData((value: any) => {
      selection.forEach(item => value[item.text] = comment);
      setDisableExport(false);
      return value;
    });
    setCommentsAdded(value => value+1);
    setValue('comment', '');
  }

  const exportFile = () => {
    const value: FileList = getValues('file');
    const file = value.item(0);
    const body = new FormData();
    body.append('files', file!);
    body.append('lines', JSON.stringify(tempData));
    const params = new URLSearchParams({
      selectedClass: getValues('species'),
    })
    fetch('http://localhost:8000/comment?' + params,
      {
        method: 'POST',
        body
      })
      .then(resp => resp.blob())
      .then(resp => {
        const url = window.URL.createObjectURL(new Blob([resp]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', value[0].name);
        document.body.appendChild(link);
        link.click();
        link.remove();
      })
      .then(() => {
        setTempData({});
        setShowSelect(false);
        setNumericFeatures([]);
        setData([]);
        setValue('file', '');
        setCommentsAdded(0);
        setDisableExport(true);
      });
  };

  const clickSelected = (filename: string, index: number) => {
    const params = new URLSearchParams({
      selectedClass: getValues('species'),
      filename
    });
    setAudioSrcIndex(index);
    setAudioSrc('');
    setTimeout(() => {
      setAudioSrc('http://localhost:8000/wav?'+params);
    });
    d3.selectAll('circle')
      .attr('stroke', getCircleColour)
      .attr('fill', getCircleColour)

    d3.selectAll('circle')
      .filter((d: any) => d.text === filename)
      .attr('stroke', 'black')
      .attr('fill', '#ffc107')
      .attr('class', 'selected')
      .raise()
      .attr('opacity', 1)
  };

  return (
    <>
      <Head>
        <title>VT-EAA: Multidimensional projection</title>
      </Head>
      <form onSubmit={handleSubmit(onSubmit)}>
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

      { showSelect &&
        <div className='m-3'>
          <label htmlFor='species' className='form-label'>Select class</label>
          <select id='species' className='form-select' {...register('species')}>
            {species.map((option, index) =>
              <option value={option} key={index}>{option}</option>
            )}
          </select>
        </div>
      }
      <div className='d-flex'>
        { numericFeatures.length !== 0 &&
          <>
            <SideList items={numericFeatures} onSubmit={sub} />
          </>
        }
        { loadging &&
          <div className='spinner-border text-primary' role='status'>
            <span className='visually-hidden'>Loading...</span>
          </div>
        }
        {data?.length !== 0 &&
          <>
            <div className='mx-auto mb-auto border border-5' style={{width: '540px'}}>
              <svg ref={chart} />
            </div>

            <div className='mx-auto mb-auto'>
              <input
                {...register('comment')}
                type='text'
                className='mb-3 form-control'
                id='comment'
              />
              <div className='d-flex'>
                <button className='btn btn-primary mx-1' type='button' onClick={addComment} disabled={!selection.length}>Add comment</button>
                <button className='btn btn-secondary mx-1' type='button' onClick={exportFile} disabled={disableExport}>Export file</button>
              </div>
              { commentsAdded > 0 &&  `${commentsAdded} comment${commentsAdded === 1 ? '' : 's'} added`}
              <br />
              { !!selection.length && <>
                <span className='fw-bold mt-3 d-block'>Selected:</span>
                <ul className={
                  classNames(
                    'border',
                    styles.selected
                  )}>
                  {selection.map((item, index) =>
                    <li
                      key={index}
                      className={
                        classNames(styles['selected-item'], {'bg-warning': index === audioSrcIndex})}
                      onClick={()=> clickSelected(item.text, index)}
                    >
                      {item.text}
                    </li>
                  )}
                </ul>
              </>
              }
              {audioSrc &&
              <audio controls>
                <source src={audioSrc} />
              </audio>
              }
            </div>
          </>
        }
      </div>
    </>
  );
}

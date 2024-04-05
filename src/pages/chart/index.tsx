import * as d3 from 'd3';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import SideList from '@components/side-list/SideList';

export default function Chart() {
  const {register, handleSubmit, getValues} = useForm();
  const chart = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<{id: number, x: number, y: number, text: string}[]>([]);
  const [tempData, setTempData] = useState<any[]>([]);
  const [tooltip, setTooltip] = useState<{x: number, y: number, text: string}>();
  const [current, setCurrent] = useState<string>();
  const [itemsC, setItemsC] = useState<string[]>([]);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [species, setSpecies] = useState<string[]>([]);
  const [selection, setSelection] = useState<any[]>([]);
  const [loadging, setLoading] = useState<boolean>(false);
  const [showSelect, setShowSelect] = useState<boolean>(false);
  // const [itemsNC, setItemsNC] = useState<string[]>([]);
  // const [selected, setSelected] = useState<string[]>([]);

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
        const feat = resp.features.reduce((prev: any, val: any) => {
          if (val.type)
            prev[0].push(val.feature)
          else
            prev[1].push(val.feature)
          return prev
        },[[],[]])

        setItemsC(feat[0]);
        setSpecies(resp.species);
        setShowSelect(true);
      });


    // const parser = parse(await value.item(0)?.text() as string,
    // (err, records: string[][]) => {
    //   // const d: {id: number, x: number, y: number, text: string}[] = [];
    //   const C: string[] = [];
    //   const NC: string[] = [];
    //   const s: Set<string> = new Set()

    //   records[0].slice(2).forEach((item,index) => {
    //     if (+records[1][index + 2]) {
    //       C.push(item);
    //     } else {
    //       NC.push(item);
    //     }
    //   });

    //   records.slice(1).forEach((item) => {
    //     s.add(item[3])
    //   })

    //   setItemsC(C);
    //   setSpecies(Array.from(s));
    //   // setItemsNC(NC);
    //   setTempData(records);
    //   setShowSelect(true);
    // });
    setTooltip(undefined);
    // parser.read();
  }

  useEffect(() => {
    if (data?.length) {
      drawChart();
    }
  }, [data]);

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

    // const X = d3.map(data, d => d.x);
    // const Y = d3.map(data, d => d.y);
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
      .attr('fill', 'steelblue')
      .attr('stroke', 'steelblue')
      .attr('stroke-width', 1.5)
      .selectAll()
      .data(data)
      .join('circle')
      .attr('id', i => i.id)
      .attr('cx', i => xScale(i.x))
      .attr('cy', i => yScale(i.y))
      .attr('r', 5);

      svg.call(d3.brush().on('start brush end', ({selection}) => {
        let value = [];
        if (selection) {
          const [[x0, y0], [x1, y1]] = selection;
          value = dots
            .style('stroke', 'steelblue')
            .filter(d => x0 <= xScale(d.x) && xScale(d.x) < x1
                    && y0 <= yScale(d.y) && yScale(d.y) < y1)
            .style('stroke', 'black')
            .data();
        } else {
          dots.style('stroke', 'black');
        }

        setSelection(value);
      }));

    // dots
    // .attr('pointer-events', 'all')
    // .on('click', d => {
    //     const id: string = d.target.id;
    //     const isSelected = id.includes('_selected');
    //     d.target.id = isSelected ? id.split('_')[0] : `${id}_selected`;
    //     d.target.style.color = isSelected ? '' : 'red';
    //   })
    //   .on('mouseover', d => {
    //     const id: string = d.target.id;
    //     if (id !== current) {
    //       setCurrent(id);
    //       setTooltip({
    //         x: d.pageX + 10,
    //         y: d.pageY + 10,
    //         text: d.target.__data__.text,
    //       });
    //     }
    //   })
    //   .on('mouseout', () => {
    //     setTooltip(undefined);
    //     setCurrent(undefined);
    //   })

    // let a = d3.select('#test').on('click', () => {
    //   d3.zoom()
    //     .on('zoom', () => {
    //       svg.attr('transform', 'scale(2)');
    //     }).scaleBy(svg, 1);
    // });
    // d3.zoom()
      // .scaleBy(svg as any, 100)

    // d3.zoom()
    //   .scaleBy(dots, 100)

  }

  const getProj = (features: string[]) => {
    setLoading(true);
    const value: FileList = getValues('file');
    const file = value.item(0);
    const body = new FormData();
    body.append('files', file!);
    const params = new URLSearchParams({
      species: getValues('species'),
      key: 'filename'
    })
    features.forEach(feature => params.append('features', feature))
    fetch('http://localhost:8000/plot?' + params,
      {
        method: 'POST',
        body
      })
      .then(resp => resp.json())
      .then(data  => {
        // const df: any[] = [];

        // Object.keys(data).forEach((key, index) => {
        //   df.push({
        //     id: key,
        //     x: data[key][0],
        //     y: data[key][1],
        //     text: fileNames[index]
        //   });
        // });


        setData(data);
      })
      .finally(() => setLoading(false));
  }

  const sub = (arr: string[]) => {
    const map: any = [];
    itemsC.forEach((item) => {
      if (arr.findIndex((it) => it === item) !== -1) {
        map.push(item)
        // map[item] = index + 4;
      }
    });
    // const df: any[] = [];
    // const names : string[] = [];
    // tempData.forEach(item => {
    //   if( item[3] !== getValues('species')) return
    //   const aux: any[] = [];
    //   arr.forEach(sel => {
    //     aux.push(item[map[sel]]);
    //   })
    //   df.push(aux);
    //   names.push(item[2]);
      // d.push({
      //   id: +item[0],
      //   x: +item[4],
      //   y: +item[5],
      //   text: item[2]
      // });
    // });

    // setSelected(arr);

    setSelection([]);
    // setFileNames(names);
    getProj(map);
  }

  const addComment = () => {
    const comment = getValues('comment')
    const value: FileList = getValues('file');
    const file = value.item(0);
    const body = new FormData();
    body.append('files', file!);
    const params = new URLSearchParams({
      species: getValues('species'),
      comment
    })
    selection.forEach(feature => params.append('lines', feature.text))
    fetch('http://localhost:8000/comment?' + params,
      {
        method: 'POST',
        body
      })
      .then(resp => resp.blob())
      .then(resp => {
        const url = window.URL.createObjectURL(new Blob([resp]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', "features.csv")
        document.body.appendChild(link)
        link.click()
        link.remove()
      })
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className='m-3'>
          <label htmlFor='file' className='form-label'>Select file</label>
          <input
            {...register('file')}
            type='file'
            className='mb-3 form-control'
            id='file'
          />

          <button className='btn btn-primary' type='submit'>Selecionar</button>
        </div>
      </form>

      { showSelect &&
        <div className='m-3'>
          <select className='form-select' {...register('species')}>
            {species.map((option, index) =>
              <option value={option} key={index}>{option}</option>
            )}
          </select>
        </div>
      }
      <div className='d-flex'>
        { itemsC.length !== 0 &&
          <>
            <SideList items={itemsC} onSubmit={sub} />
          </>
        }
        {/* <SideList items={itemsNC} /> */}
        { loadging &&
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        }
        {data?.length !== 0 &&
          <>
            <div className='mx-auto mb-auto border border-5' style={{width: '540px'}}>
              {/* <button id='test' type='button' className='btn btn-light'>
                <i className="bi bi-plus-circle"></i>
              </button>
              <button type='button' className='btn btn-light'>
                <i className="bi bi-dash-circle"></i>
              </button> */}
              <svg ref={chart} />
              { tooltip &&
                <div
                  ref={tooltipRef}
                  id='tooltip'
                  className='position-absolute p-1 rounded-end-pill text-success bg-white bg-opacity-75 border border-success'
                  style={{left: tooltip?.x+'px', top: tooltip?.y+'px'}}
                >{tooltip?.text}</div>
              }
            </div>

            <div className='mx-auto mb-auto'>
            <input
              {...register('comment')}
              type='text'
              className='mb-3 form-control'
              id='comment'
            />
            <button className='btn btn-primary' type='button' onClick={addComment}>Add comment</button>
            <br />
              <span className='fw-bold'>Selected:</span>
              <ul>
                {selection.map((item, index) =>
                  <li key={index}>
                    {item.text}
                  </li>
                )}
              </ul>
            </div>
          </>
        }
      </div>
    </>
  );
}
import { parse } from 'csv-parse';
import * as d3 from 'd3';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

export default function Home() {
  const {register, handleSubmit, getValues, setValue} = useForm();
  const [showSelect, setShowSelect] = useState<boolean>();
  const [maxVal, setMaxVal] = useState<number>();
  const [minFreq, setMinFreq] = useState<number>();
  const [map, setMap] = useState<{[key: string]: number}>({});
  const [options, setOptions] = useState<string[]>([]);
  const chart = useRef<SVGSVGElement>(null);

  const onSubmit = async () => {
    const value: FileList = getValues('files');
    const map: {[key: string]: number} = {};



    for(let index = 0; index < value.length; index++) {
      const parser = parse(await value.item(index)?.text() as string, {delimiter: '\t'},
        (err, records: string[][]) => {

        records?.slice(1).forEach(item => {
          const val = map[item[7]];
          if (val) {
            map[item[7]]++;
          } else {
            map[item[7]] = 1;
          }
        })
      });
      parser.read();
    }

    const aux: string[] = [];
    const keys = Object.keys(map);
    keys.sort((a,b) => map[b] - map[a]).forEach(item =>
      aux.push(`${item} - ${map[item]}`)
    );

    const max = Math.max(...Object.values(map));
    const initVal = Math.floor(max / 2);
    setOptions(aux);
    setShowSelect(true);
    setMaxVal(max);
    setMap(map);
    setMinFreq(initVal);
    setValue('range', initVal);
    drawChart();
  };

  const drawChart = () => {
    const data = Object.keys(map)
      .filter(key => map[key] > minFreq
    ) .map( key => ({species: key, freq: map[key]}));
    const barHeight = 30;
    const barPadding = 5;
    const width = 960;
    const marginTop = 30;
    const marginRight = 40;
    const marginBottom = 30;
    const marginLeft = 30;
    const height = (barHeight + barPadding )* data.length + marginTop + marginBottom;

    const bars = d3.select(chart.current);
    bars.selectAll('*').remove();

    const y = d3.scaleBand()
      .domain(d3.groupSort(data, ([d]) => -d.freq, (d) => d.species)) // descending frequency
      .range([marginTop, height - marginBottom])
      // .padding(0.1);

      const max = d3.max(data, d => d.freq);

    const x = d3.scaleLinear()
      .domain([0, max])
      .range([width - marginRight, marginLeft])

    bars
      .attr('viewBox', [0, 0, width, height])
      .attr('style', 'width: auto ; height: auto');

    const tip = bars
      .append('div')
      .attr('id', 'tooltip')
      .attr('style', 'position: absolute; opacity: 0;');

    bars.append('g')
      .attr('fill', 'steelblue')
      .selectAll()
      .data(data)
      .join('rect')
      .attr('x', (d) => marginBottom)
      .attr('y', (d) => y(d.species))
      .attr('width', (d) => x(0) - x(d.freq))
      .attr('height', barHeight)
      /* .on('mouseover', (d) => {
        tip.style('opacity', 1).text(d);
        console.log(tip);
      })
      .on('mouseout', (d) => {
        tip.style('opacity', 0);
      }); */

  bars.append('g')
      .attr('transform', `translate(${marginBottom}, 0)`)
      .call(d3.axisRight(y).tickSizeOuter(0));

  bars.append('g')
      .attr('transform', `translate(0,${marginLeft})`)
      .call(d3.axisTop(x).tickFormat((x) => max - x));
  }

  const updateChart = () => {
    setMinFreq(getValues('range'))
    drawChart();
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className='m-3'>
          <label htmlFor='files' className='form-label'>Select directory</label>
          <input
            {...register('files')}
            type='file'
            className='mb-3 form-control'
            multiple
            webkitdirectory=''
            directory=''
            id='files'
          />

          <button className='btn btn-primary' type='submit'>Selecionar</button>
        </div>

        { showSelect &&
        <>
          <div className='m-3'>
            <select className='form-select'>
              {options.map((option, index) =>
                <option value={option} key={index}>{option}</option>
              )}
            </select>
          </div>

          <div className='m-3'>
            <label htmlFor='range' className='form-label'>Minimum Frequency: {minFreq}</label>
            <div className="d-flex">
              <div>0</div>
              <input
                {...register('range')}
                type='range'
                className='form-range p-5'
                id='range'
                min='0'
                max={maxVal}
                step='1'
                onInput={updateChart}
              />
              <div>{maxVal}</div>
            </div>

          </div>

          <div className='m-5'>
            <svg ref={chart} />
          </div>
        </>
        }

      </form>
    </>
  )
}

declare module 'react' {
  interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
    directory?: string;
    webkitdirectory?: string;
  }
}

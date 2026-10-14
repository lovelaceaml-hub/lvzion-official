import WorshipPreview from '../../components/worship-duty/worship-preview';
export const metadata={title:'Worship Duty · Fictional review',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{layout?:string}>}) {
 const {layout}=await searchParams;
 return <WorshipPreview initialLayout={layout==='agenda'?'agenda':'focus'}/>;
}

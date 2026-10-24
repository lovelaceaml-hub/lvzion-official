export const metadata={title:'Page not found | LV Zion Official',robots:{index:false,follow:false}};
export default function NotFound(){
 return <div className="ui-page">
  <main className="ui-main ui-narrow">
   <h1 className="ui-title">Page not found</h1>
   <p className="ui-lede">This page does not exist, or it is not available to your account.</p>
   <p><a className="ui-button" href="/">Go to Home</a></p>
  </main>
 </div>;
}

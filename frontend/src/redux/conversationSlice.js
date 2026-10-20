import { createSlice } from "@reduxjs/toolkit";

const conversationSlice=createSlice({
    name:"conversation",
    initialState:{
      conversations:[],
      selectedConversation:null
    },
    reducers:{
       setConversations:(state,action)=>{
        state.conversations=action.payload
       },
      addConversation:(state,action)=>{
        // `hydrated: false` marks a conversation that was just created on the
        // client. It has no server-side messages yet, so the chat view must
        // not overwrite the locally rendered messages with an empty fetch.
        state.conversations.unshift({ ...action.payload, hydrated: false })
       },
        setSelectedConversation:(state,action)=>{
        state.selectedConversation=action.payload
       },

      setConvTitle:(state,action)=>{
           const {title,conversationId}=action.payload
           state.conversations=state.conversations.map((conv)=>(
            conv._id==conversationId?(
             { ...conv,title}
            ):conv
           )) 

           if(state.selectedConversation?._id==conversationId){
               state.selectedConversation={...state.selectedConversation,title}
           }
      }

    }
   
})

export const {setConversations,addConversation,setSelectedConversation,setConvTitle}=conversationSlice.actions 
export default conversationSlice.reducer
